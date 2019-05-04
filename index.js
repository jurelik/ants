const sl = require('staylow');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const io = socketio.listen(4000);
sl.defaultPrompt('');

const privateKey = fs.readFileSync('./private.key', 'utf8');
const publicKey = fs.readFileSync('./public.key', 'utf8')
const clients = [];

function serverInit() {
  sl.prompt('Enter username: ', res => {
    let username = res;
    sl.prompt('Enter password: ', true, res => {
      mongoose.connect(`mongodb+srv://${username}:${res}@jl-cluster-test-24u6z.mongodb.net/ants?retryWrites=true`, {useNewUrlParser: true}, (err) => {
        defaultPrompt();
        if (err) {
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
  }
});

io.on('connection', socket => {
  clients.push(socket.id);

  //Login event
  socket.on('login', data => {
    User.findOne({name: data.name}, (err, user) => {
      if (!err && user) { //If user exists
        if (user.pw === data.pw) { //If password is correct
          User.updateOne({name: data.name}, {id: socket.id, pubKey: data.pubKey}, (err, raw) => { //Update id to current session socket.id
            if (!err) {
              //Create jwtToken
              jwt.sign({name: data.name, id: socket.id}, privateKey, {algorithm: 'RS256', expiresIn: '1d'}, (err, token) => {
                if (!err) {
                  socket.emit('login', {type: 'loginSuccessful', name: data.name, token: token});
                }
                else {
                  socket.emit('login', {type: 'error', error: err});
                  sl.log(err);
                }
              });
            }
            else {
              socket.emit('login', {type: 'error', error: err});
            }
          });
        }
        else {
          socket.emit('login', {type: 'loginFailed'});
        }
      }
      else if (!err && !user) {
        socket.emit('login', {type: 'loginFailed'});
      }
      else {
        socket.emit('login', {type: 'error', error: err});
      }
    });
  });

  //Register event
  socket.on('register', data => {
    let user = new User({name: data.name, pw: data.pw, salt: data.salt, id: socket.id, pubKey: ''});
    User.findOne({name: user.name}, (err, docs) => { //Check if user exists already
      if (!docs && !err) {
        user.save(err => {
          if (!err) {
            socket.emit('register', {type: 'success'});
          }
          else {
            socket.emit('register', {type: 'failed', err: err});
          }
        });
      }
      else if (docs && !err) {
        socket.emit('register', {type: 'userExists'});
      }
      else {
        socket.emit('register', {type: 'failed', err: err});
      }
    });
  });

  //getSalt event
  socket.on('getSalt', data => {
    User.findOne({name: data.name}, (err, res) => { //Check if user exists
      if (!err && res) {
        socket.emit('getSalt', {type: 'success', name: data.name, salt: res.salt});
      }
      else if (!err && !res) {
        let salt = crypto.randomBytes(128).toString('base64');
        socket.emit('getSalt', {type: 'success', name: data.name, salt})
      }
      else {
        socket.emit('getSalt', {type: 'error', err});
      }
    });
  });

  //List event
  socket.on('ls', data => {
    jwt.verify(data.token, publicKey, (err, decoded) => {
      if (!err) {
        socket.emit('ls', {rooms: listRooms(), username: data.username, token: data.token});
      }
      else {
        sl.log(err);
      }
    });
  });

  //Join room event
  socket.on('join', data => {
    socket.join(data.room, (err) => {
      if (!err) {
        socket.emit('join', {type: 'success', room: data.room, username: data.username});
      }
      else {
        sl.log(err);
        socket.emit(join, {type: 'failed', username: data.username})
      }
    });
  });

  //Message event
  socket.on('message', data => {
    socket.to(data.room).emit('message', {message: data.message, username: data.username});
  });
});

function listRooms() {
  let socketRooms = Object.keys(io.sockets.adapter.rooms);

  //Remove clients from the list of rooms
  clients.forEach(client => {
    socketRooms.splice(socketRooms.indexOf(client), 1);
  });

  return socketRooms;
}

function defaultPrompt() {
  sl.prompt('', res => {
    defaultPrompt();
  });
};

// function generateUserID() {
//   return Math.round(((Math.random() + 1) * Date.now())).toString();
// }