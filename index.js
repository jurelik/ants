const sl = require('staylow');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const Room = require('./models/rooms');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const io = socketio.listen(4000);
sl.options({
  defaultPrompt: '',
});

const privateKey = fs.readFileSync('./private.key', 'utf8');
const publicKey = fs.readFileSync('./public.key', 'utf8')

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

  socket.allRooms = [];
  //Login event
  socket.on('login', data => {
    User.findOne({name: data.name}, (err, user) => {
      if (!err && user) { //If user exists
        if (user.pw === data.pw) { //If password is correct
          User.updateOne({name: data.name}, {id: socket.id, pubKey: data.pubKey}, (err, raw) => { //Update id to current session socket.id
            if (!err) {
              //Create jwtToken
              jwt.sign({name: data.name}, privateKey, {algorithm: 'RS256', expiresIn: '1d', jwtid: socket.id}, (err, token) => {
                if (!err) {
                  socket.username = data.name
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
    let user = new User({name: data.name, pw: data.pw, salt: data.salt, id: socket.id, pubKey: {}});
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

  //lsRooms event
  socket.on('lsRooms', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        Room.find({}, (err, res) => {
          if (!err && res) {
            let roomList = [];
            res.forEach(room => {
              roomList.push(room.name);
            });
            socket.emit('lsRooms', {type: 'success', rooms: roomList});
          }
          else {
            socket.emit('lsRooms', {type: 'failed', err});
          }
        });
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //lsUsers event
  socket.on('lsUsers', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        Room.findOne({name: socket.activeRoom}, (err, res) => {
          if (!err && res) {
            let userList = [];
            res.users.forEach(user => {
              userList.push(user.name);
            });
            socket.emit('lsUsers', {type: 'success', userList});
          }
          else {
            socket.emit('lsUsers', {type: 'failed', err});
          }
        });
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //Join room event
  socket.on('join', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        let joined = false;
        socket.allRooms.some(room => {
          if (room === data.room) {
            joined = true;
            return true;
          }
        })
        if (!joined) {
          Room.findOne({name: data.room}, (err, res) => {
            if (!err && res) {
              res.users.push(data.user);
              socket.activeRoom = data.room;
              socket.allRooms.push(data.room);
              socket.emit('join', {type: 'success', room: data.room});
              res.save(err => {
                if (err) {
                  socket.emit('join', {type: 'failed', err});
                }
              })
            }
            else if (!err && !res) {
              socket.emit('join', {type: 'notFound'})
            }
            else {
              socket.emit('join', {type: 'error', err})
            }
          });
        }
        else {
          sl.log('yoooo');
          socket.emit('join', {type: 'alreadyJoined'});
        }
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //Create room event
  socket.on('create', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        let room = new Room({name: data.room, owner: data.user.name});
        Room.findOne({name: data.room}, (err, res) => {
          if (!err && !res) {
            room.save(err => {
              if (!err) {
                socket.emit('create', {type: 'success', room: data.room});
              }
              else {
                socket.emit('create', {type: 'failed', err});
              }
            })
          }
          else if (!err && res) {
            socket.emit('create', {type: 'roomExists'});
          }
          else {
            socket.emit('create', {type: 'failed', err});
          }
        })
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  })

  //Switch event
  socket.on('switch', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        let joined = false;
        socket.allRooms.some(room => {
          if (room === data.room) {
            joined = true;
            return true;
          }
        });
        if (joined) {
          socket.emit('switch', {type: 'success', room: data.room});
          socket.activeRoom = data.room;
        }
        else {
          socket.emit('switch', {type: 'failed'});
        }
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //msgInit event
  socket.on('msgInit', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err && data.visible === 'public') {
        let userList = [];
        Room.find({name: socket.activeRoom}, (err, res) => {
          if (!err && res) {
            res[0].users.forEach(user => {
              let userData = {
                id: user.id,
                pubKey: user.pubKey
              };
              userList.push(userData);
            });
            socket.emit('msgInit', {type: 'success', visible: 'public', userList});
          }
          else {
            socket.emit('msgInit', {type: 'failed'});
          }
        });
      }
      else if (!err && data.visible === 'private') {
        let userList = [];
        User.findOne({name: data.dest}, (err, res) => {
          if (!err && res) {
            let userData = {
              id: res.id,
              pubKey: res.pubKey
            }
            userList.push(userData);
            socket.emit('msgInit', {type: 'success', visible: 'private', userList});
          }
        })
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  })

  //Message event
  socket.on('msg', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err && data.visible === 'public') {
        if (data.dest === socket.id) {
          socket.emit('msg', {type: 'success', visible: 'public', msg: data.msg, from: decoded.name, room: socket.activeRoom});
        }
        socket.to(data.dest).emit('msg', {type: 'success', visible: 'public', msg: data.msg, from: decoded.name, room: socket.activeRoom});
      }
      else if (!err && data.visible === 'private') {
        if (data.dest === socket.id) {
          socket.emit('msg', {type: 'success', visible: 'private', self: true, msg: data.msg, to: data.to});
        }
        socket.to(data.dest).emit('msg', {type: 'success', visible: 'private', self: false, msg: data.msg, from: decoded.name});
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //Disconnect event
  socket.on('disconnect', data => {
    socket.allRooms.forEach(room => {
      Room.findOne({name: room}, (err, res) => {
        res.users.some(user => {
          if (user.name === socket.username) {
            res.users.splice(res.users.indexOf(user), 1);
            res.save();
            return true;
          }
        });
      })
    })
  });
});

function defaultPrompt() {
  sl.prompt('', res => {
    defaultPrompt();
  });
};

function verifyToken(data, id, callback) {
  jwt.verify(data.token, publicKey, {jwtid: id, algorithms: 'RS256'}, (err, decoded) => {
    callback(err, decoded);
  });
}