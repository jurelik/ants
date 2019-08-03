//INIT
const sl = require('staylow');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const Room = require('./models/rooms');
const fs = require('fs');
const jwt = require('jsonwebtoken');

//Init socket.io and a http server
const io = socketio.listen(4000);

//Export functions and import events
module.exports = {
  createToken,
  verifyToken,
  disconnect
}
const events = require('./events')(io);

//Private and public keys for JWT
const privateKey = fs.readFileSync('./private.key', 'utf8');
const publicKey = fs.readFileSync('./public.key', 'utf8');

sl.options({
  defaultPrompt: '',
});
let welcomeMsg = 'Welcome to ants.';

//Connect to MongoDB
function serverInit() {
  sl.prompt('Enter username: ', res => {
    let username = res;
    sl.prompt('Enter password: ', true, res => {
      mongoose.connect(`mongodb+srv://${username}:${res}@jl-cluster-test-24u6z.mongodb.net/ants?retryWrites=true`, {useNewUrlParser: true}, (err) => {
        if (!err) {
          defaultPrompt();
        }
        else {
          serverInit();
        }
      });
    });
  });
};

serverInit(); //Initialize connection

mongoose.connection.once('open', () => {
  sl.log('connection to MongoDB has been made.');
})
.on('error', err => { //Error handler
  if(err.message === 'Authentication failed.') {
    sl.log('Username or password incorrect.');
    serverInit();
  }
  else {
    sl.log('MongoDB Error: ' + err.message);
    serverInit();
  }
});

//
// Functions
//

function defaultPrompt() {
  sl.prompt('', res => {
    if (res === ':q') {
      let err = 0;
      sl.log('Shutting down...');
      Room.updateMany({}, {users: []}, (err, raw) => {
        if (!err) {
          sl.log('Rooms wiped...')
        }
        else {
          sl.log('Error: ' + err.message);
        }
      });
      User.updateMany({}, {online: false}, (err, raw) => {
        if (!err) {
          sl.log('Server shut down successfully.');
          process.exit();
        }
        else {
          sl.log('Error: ' + err.message);
        }
      });
    }
    else if (res.startsWith(':w ')) {
      welcomeMsg = res.slice(3);
      defaultPrompt();
    }
    else {
      defaultPrompt();
    }
  });
};

function createToken(data, socket) {
  jwt.sign({name: data.name}, privateKey, {algorithm: 'RS256', expiresIn: '1d', jwtid: socket.id}, (err, token) => {
    if (!err) {
      socket.username = data.name; //Save username so user can be removed from rooms on disconnect
      socket.emit('login', {type: 'success', name: data.name, token, welcome: welcomeMsg});
    }
    else {
      socket.emit('login', {type: 'error', err});
      sl.log(err);
    }
  });
}

function verifyToken(data, id, callback) {
  jwt.verify(data.token, publicKey, {jwtid: id, algorithms: 'RS256'}, (err, decoded) => {
    callback(err, decoded);
  });
}

function disconnect(socket) {
  socket.allRooms.forEach(room => {
    Room.findOne({name: room}, (err, res) => {
      if (!err && res) {
        let userJoined = false;
        res.users.some(user => {
          if (user.name === socket.username) {
            userJoined = true;
            return true;
          }
        });
        if (userJoined) {
          for (let x = 0; x < res.users.length; x++) {
            if (res.users[x].name === socket.username) {
              res.users.splice(x, 1);
              x--;
              res.save(err => {
                if (err && err.message.startsWith('No matching document found for id')) {
                  disconnect(socket);
                }
                else if (err && !err.message.startsWith('No matching document found for id')) {
                  sl.log(err.message);
                }
              });
            }
            else {
              socket.to(res.users[x].id).emit('msg', {type: 'userLeft', msg: `${socket.username} left the room.`, room});
            }
          }
        }
      }
      else {
        sl.log('Joined room not found after disconnect.');
      }
    });
  });
  User.updateOne({name: socket.username}, {online: false}, (err) => {
    if (err) {
      sl.log(err);
    }
  });
}