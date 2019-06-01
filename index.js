//INIT
const sl = require('staylow');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const Room = require('./models/rooms');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

//Init socket.io and a http server
const io = socketio.listen(4000);
sl.options({
  defaultPrompt: '',
});

//Private and public keys for JWT
const privateKey = fs.readFileSync('./private.key', 'utf8');
const publicKey = fs.readFileSync('./public.key', 'utf8')

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
                  socket.username = data.name; //Save username so user can be removed from rooms on disconnect and checked for room ownership
                  socket.emit('login', {type: 'success', name: data.name, token: token});
                }
                else {
                  socket.emit('login', {type: 'error', err});
                  sl.log(err);
                }
              });
            }
            else {
              socket.emit('login', {type: 'error', err});
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
        socket.emit('login', {type: 'error', err});
      }
    });
  });

  //Register event
  socket.on('register', data => {
    let regex = /^\w+$/;
    if (regex.test(data.name) && data.name.length >= 3) {
      let user = new User({name: data.name, pw: data.pw, salt: data.salt, id: socket.id, pubKey: {}});
      User.findOne({name: user.name}, (err, docs) => { //Check if user exists already
        if (!docs && !err) {
          user.save(err => {
            if (!err) {
              socket.emit('register', {type: 'success'});
            }
            else {
              socket.emit('register', {type: 'error', err});
            }
          });
        }
        else if (docs && !err) {
          socket.emit('register', {type: 'userExists'});
        }
        else {
          socket.emit('register', {type: 'error', err});
        }
      });
    }
    else {
      socket.emit('register', {type: 'badUsername'});
    }
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

  //List rooms event
  socket.on('lsRooms', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        Room.find({}, (err, res) => { //Find all room documents and push their names into array
          if (!err && res) {
            let roomList = [];
            res.forEach(room => {
              roomList.push(room.name);
            });
            socket.emit('lsRooms', {type: 'success', rooms: roomList});
          }
          else {
            socket.emit('lsRooms', {type: 'error', err});
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
        Room.findOne({name: socket.activeRoom}, (err, res) => { //Find all users in room and push into array
          if (!err && res) {
            let userList = [];
            res.users.forEach(user => {
              userList.push(user.name);
            });
            socket.emit('lsUsers', {type: 'success', userList});
          }
          else {
            socket.emit('lsUsers', {type: 'error', err});
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
        //Check if room is joined already
        socket.allRooms.some(room => {
          if (room === data.room) {
            joined = true;
            return true;
          }
        });
        if (!joined) { //If not joined yet
          Room.findOne({name: data.room}, (err, res) => {
            if (!err && res && !res.private) {
              socket.activeRoom = data.room; //Change activeRoom
              socket.allRooms.push(data.room); //Add to list of all the rooms this socket has joined so far
              res.users.forEach(user => {
                const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(`${socket.username} joined the room.`));
                socket.to(user.id).emit('msg', {type: 'userJoined', msg, room: socket.activeRoom});
              });
              res.users.push(data.user);
              socket.emit('join', {type: 'success', room: data.room, welcome: res.welcome});
              res.save(err => {
                if (!err) {
                  socket.emit('join', {type: 'success', room: data.room, welcome: res.welcome});
                }
                else {
                  socket.emit('join', {type: 'error', err});
                }
              });
            }
            else if (!err && res && res.private) {
              socket.emit('join', {type: 'private', room: data.room, salt: res.salt});
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
          socket.emit('join', {type: 'alreadyJoined'});
        }
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //Join private room event
  socket.on('joinPrivate', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        Room.findOne({name: data.room}, (err, res) => {
          if (!err && res) {
            if (data.pw === res.pw) {
              socket.activeRoom = data.room; //Change activeRoom
              socket.allRooms.push(data.room); //Add to list of all the rooms this socket has joined so far
              res.users.forEach(user => {
                const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(`${socket.username} joined the room.`));
                socket.to(user.id).emit('msg', {type: 'userJoined', msg, room: socket.activeRoom});
              });
              res.users.push(data.user);
              socket.emit('join', {type: 'success', room: data.room, welcome: res.welcome});
              res.save(err => {
                if (!err) {
                  socket.emit('join', {type: 'success', room: data.room, welcome: res.welcome});
                }
                else {
                  socket.emit('join', {type: 'error', err});
                }
              });
            }
            else {
              socket.emit('join', {type: 'wrongPassword'});
            }
          }
          else {
            socket.emit('join', {type: 'error', err});
          }
        });
      }
      else {
        socket.emit('tokenNotValid');
      }
    });
  });

  //Leave room event
  socket.on('leave', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        Room.findOne({name: data.room}, (err, res) => {
          if (!err && res) {
            for (x = 0; x < res.users.length; x++) {
              if (res.users[x].name === socket.username) {
                res.users.splice(x, 1); // Remove user from room
                socket.allRooms.splice(socket.allRooms.indexOf(data.room), 1); //Remove room from list of rooms socket is connected to
                res.save(err => {
                  if (!err) {
                    socket.emit('leave', {type: 'success', room: data.room});
                  }
                  else {
                    socket.emit('leave', {type: 'error', err});
                  }
                });
                x--;
              }
              else {
                const msg = crypto.publicEncrypt(res.users[x].pubKey, Buffer.from(`${socket.username} left the room.`))
                socket.to(res.users[x].id).emit('msg', {type: 'userLeft', msg, room: res.name});
              }
            }
          }
          else if (!err && !res) {
            socket.emit('leave', {type: 'roomNotFound'});
          }
          else {
            socket.emit('leave', {type: 'error', err});
          }
        });
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
        let regex = /^\w+$/;
        if (regex.test(data.room) && data.room.length >= 3) {
          if (!data.private) {
            let room = new Room({name: data.room, owner: data.user.name, private: false, welcome: `Welcome to ${data.room}!`});
            Room.findOne({name: data.room}, (err, res) => { //Check if room exists already
              if (!err && !res) {
                room.save(err => {
                  if (!err) {
                    socket.emit('create', {type: 'success', room: data.room});
                  }
                  else {
                    socket.emit('create', {type: 'error', err});
                  }
                })
              }
              else if (!err && res) {
                socket.emit('create', {type: 'roomExists'});
              }
              else {
                socket.emit('create', {type: 'error', err});
              }
            });
          }
          else {
            let room = new Room({name: data.room, owner: data.user.name, private: true, pw: data.pw, salt: data.salt, welcome: `Welcome to ${data.room}!`});
            Room.findOne({name: data.room}, (err, res) => {
              if (!err && !res) {
                room.save(err => {
                  if (!err) {
                    socket.emit('create', {type: 'success', room: data.room});
                  }
                  else {
                    socket.emit('create', {type: 'error', err});
                  }
                });
              }
              else if (!err && res) {
                socket.emit('create', {type: 'roomExists'});
              }
              else {
                socket.emit('create', {type: 'error', err});
              }
            });
          }
        }
        else {
          socket.emit('create', {type: 'badName'});
        }
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
        //Check if socket is connected to the room
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
      if (!err && data.visible === 'public') { //If message is public
        let userList = [];
        //Find all users in room
        Room.findOne({name: socket.activeRoom}, (err, res) => {
          if (!err && res) {
            res.users.forEach(user => {
              let userData = {
                id: user.id,
                pubKey: user.pubKey
              };
              userList.push(userData);
            });
            socket.emit('msgInit', {type: 'success', visible: 'public', userList});
          }
          else {
            socket.emit('msgInit', {type: 'error', err});
          }
        });
      }
      else if (!err && data.visible === 'private') { //If message is private
        let userList = [];
        //Find user
        User.findOne({name: data.dest}, (err, res) => {
          if (!err && res) {
            let userData = {
              id: res.id,
              pubKey: res.pubKey
            }
            userList.push(userData);
            socket.emit('msgInit', {type: 'success', visible: 'private', userList});
          }
          else if (!err && !res) {
            socket.emit('msgInit', {type: 'notFound', visible: 'private'})
          }
          else {
            socket.emit('msgInit', {type: 'error', err});
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

  //Welcome message set event
  socket.on('welcome', data => {
    verifyToken(data, socket.id, (err, decoded) => {
      if (!err) {
        Room.findOne({name: socket.activeRoom}, (err, res) => {
          if (!err && res) {
            if (res.owner === socket.username) {
              res.welcome = data.msg;
              res.save(err => {
                if (!err) {
                  socket.emit('welcome', {type: 'success'});
                }
                else {
                  socket.emit('welcome', {type: 'error', err});
                }
              });
            }
            else {
              socket.emit('welcome', {type: 'badOwner'});
            }
          }
          else {
            if (err) {
              socket.emit('welcome', {type: 'error', err});
            }
            else {
              socket.emit('welcome', {type: 'error', [err.message]: 'Unknown'});
            }
          }
        });
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
        for (x = 0; x < res.users.length; x++) {
          if (res.users[x].name === socket.username) {
            res.users.splice(x, 1);
            res.save(err => {
              if (err) {
                sl.log(err.message);
              }
            });
            x--;
          }
          else {
            const msg = crypto.publicEncrypt(res.users[x].pubKey, Buffer.from(`${socket.username} left the room.`))
            socket.to(res.users[x].id).emit('msg', {type: 'userLeft', msg, room: res.name});
          }
        }
      });
    });
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