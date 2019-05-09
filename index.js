const sl = require('staylow');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const Room = require('./models/rooms');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
sl.defaultPrompt('');

const privateKey = fs.readFileSync('./private.key', 'utf8');
const publicKey = fs.readFileSync('./public.key', 'utf8');
const certOptions = {
  key: fs.readFileSync('./tls/localhost.key'),
  cert: fs.readFileSync('./tls/localhost.crt')
}

const server = require('https').createServer(certOptions).listen(4000);
const io = socketio(server, {
  //REMOVE THIS IN PRODUCTION!!!
  rejectUnauthorized: false
  //REMOVE THIS IN PRODUCTION!!!
});

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
  //Login event
  socket.on('login', data => {
    User.findOne({name: data.name}, (err, user) => {
      if (!err && user) { //If user exists
        if (user.pw === data.pw) { //If password is correct
          user.id = socket.id;
          user.save(err => {
            if(!err) {
              jwt.sign({name: data.name}, privateKey, {algorithm: 'RS256', expiresIn: '1d', jwtid: socket.id}, (err, token) => {
                if (!err) {
                  socket.emit('login', {type: 'success', token});
                }
                else {
                  socket.emit('login', {type: 'error', error: err});
                }
              });
            }
            else {
              socket.emit('login', {type: 'error', error: err});
            }
          });
        }
        else {
          socket.emit('login', {type: 'failed'});
        }
      }
      else if (!err && !user) {
        socket.emit('login', {type: 'failed'});
      }
      else {
        socket.emit('login', {type: 'error', error: err});
      }
    });
  });

  //Register event
  socket.on('register', data => {
    let user = new User({name: data.name, pw: data.pw, salt: data.salt, id: socket.id});
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
        //Fake a salt to prevent an attacker from realizing a user doesn't exist
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
    jwt.verify(data.token, publicKey, {jwtid: socket.id}, (err, decoded) => {
      if(!err) {
        Room.find({}, (err, res) => {
          if (!err) {
            let roomList = [];
            res.forEach(room => {
              roomList.push(room.name);
            });
            socket.emit('ls', {type: 'success', rooms: roomList});
          }
          else {
            socket.emit('ls', {type: 'failed', err});
          }
        }) 
      }
      else {
        socket.emit('tokenNotValid', {err});
      }
    });
  });

  //Join room event
  socket.on('join', data => {
    jwt.verify(data.token, publicKey, {jwtid: socket.id}, (err, decoded) => {
      if (!err) {
        Room.findOne({name: data.room}, (err, res) => { //Find the room
          if (!err && res) {
            socket.join(data.room, err => {
              if(!err) {
                socket.activeRoom = data.room;
                socket.emit('join', {type: 'success', room: data.room});
              }
              else {
                socket.emit('join', {type: 'failed', err});
              }
            });
          }
          else if (!err && !res) {
            socket.emit('join', {type: 'notFound'})
          }
          else {
            socket.emit('join', {type: 'failed', err});
          }
        });
      }
      else {
        sl.log(err);
        socket.emit('join', {type: 'failed', err});
      }
    });
  });

  // //Create room event
  socket.on('create', data => {
    jwt.verify(data.token, publicKey, {jwtid: socket.id}, (err, decoded) => {
      if (!err) {
        let room = new Room({name: data.room, owner: decoded.name});
        Room.findOne({name: data.room}, (err, res) => {
          if (!err && !res) { //If room doesn't exist yet
            room.save(err => {
              if (!err) {
                socket.emit('create', {type: 'success', room: data.room});
              }
              else {
                socket.emit('create', {type: 'failed', err});
              }
            })
          }
          else if (!err && res) { //If room already exists
            socket.emit('create', {type: 'roomExists'});
          }
          else {
            socket.emit('create', {type: 'failed', err});
          }
        });
      }
      else {
        socket.emit('tokenNotValid', {err});
      }
    });
  });

  //Message event
  socket.on('msg', data => {
    jwt.verify(data.token, publicKey, {jwtid: socket.id}, (err, decoded) => {
      if (!err) {
        socket.to(socket.activeRoom).emit('msg', {msg: data.msg, name: decoded.name});
      }
      else {
        socket.emit('tokenNotValid', {});
      }
    });
  });

  //Disconnect event
  socket.on('disconnect', () => {
//     User.findOne({id: socket.id}, (err, resUser) => { //get the disconnected user
//       if (resUser.room) {
//         //find the room that the user is connected to and remove him from the users array  
//         Room.findOne({name: resUser.room}, (err, resRoom) => {
//           resRoom.users.forEach(user => {
//             if (user.name === resUser.name) {
//               resRoom.users.splice(resRoom.users.indexOf(user), 1);
//             }
//           });
//           resRoom.save(err => {
//             if (!err) {
//               resUser.room = null;
//               resUser.save(err => {
//                 if (!err) {
//                   //MAKE SURE TO DELETE THIS IN PRODUCTION!!!
//                   sl.log(`${resUser.name} disconnected [${resRoom.name}]`);
//                 }
//                 else {
//                   sl.log(`Error disconnecting user: ${resUser.name}`);
//                 }
//               });
//             }
//             else {
//               sl.log(`Error disconnecting user: ${resUser.name}`);
//             }
//           });
//         });
//       }
//       else {
//         //MAKE SURE TO DELETE THIS IN PRODUCTION!!!
//         sl.log(`${resUser.name} disconnected [no room]`);
//       }
//     });
  });
});

function listRooms() {
  let roomList = [];
  rooms = Room.find({}, (err, res) => {
    res.forEach(room => {
      roomList.push(room.name);
    });
    sl.log(roomList);
    return roomList;
  });
}

function defaultPrompt() {
  sl.prompt('', res => {
    defaultPrompt();
  });
};