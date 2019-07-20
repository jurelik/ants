const sl = require('staylow');
const User = require('./models/users');
const Room = require('./models/rooms');
const server = require('./index');

module.exports = function(io) {
  io.on('connection', socket => {
    socket.allRooms = [];
  
    //Login event
    socket.on('login', data => {
      User.findOne({name: data.name}, (err, user) => {
        if (!err && user) { //If user exists
          if (user.pw === data.pw && !user.online) { //If password is correct
            User.updateOne({name: data.name}, {id: socket.id, pubKey: data.pubKey, online: true}, (err, raw) => { //Update id to current session socket.id
              if (!err) {
                server.createToken(data, socket);
              }
              else {
                socket.emit('login', {type: 'error', err});
              }
            });
          }
          else if (user.pw === data.pw && user.online) {
            socket.emit('login', {type: 'alreadyOnline'});
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
      if (regex.test(data.name) && data.name.length >= 3 && data.name.length <= 15) {
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
          socket.emit('getSalt', {type: 'success', name: data.name, salt: 'oops'})
        }
        else {
          socket.emit('getSalt', {type: 'error', err});
        }
      });
    });
  
    //List rooms event
    socket.on('lsRooms', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          Room.find({}, (err, res) => { //Find all room documents and push their names into array
            if (!err && res) {
              let roomList = [];
              res.forEach(room => {
                if (!room.private) {
                  roomList.push(room.name);
                }
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
          server.disconnect(socket);
        }
      });
    });
  
    //lsUsers event
    socket.on('lsUsers', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
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
          server.disconnect(socket);
        }
      });
    });
  
    //Join room event
    socket.on('join', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
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
                  socket.to(user.id).emit('msg', {type: 'userJoined', msg: `${decoded.name} joined the room.`, room: socket.activeRoom});
                });
                res.users.push(data.user);
                res.save(err => {
                  if (!err) {
                    socket.emit('join', {type: 'success', room: data.room, welcome: res.welcome});
                  }
                  else {
                    socket.emit('join', {type: 'error', err});
                  }
                });
              }
              else if (!err && res && res.private && res.pw) {
                socket.emit('join', {type: 'private', room: data.room, pw: true, salt: res.salt});
              }
              else if (!err && res && res.private && !res.pw) {
                socket.emit('join', {type: 'private', room: data.room, pw: false});
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
          server.disconnect(socket);
        }
      });
    });
  
    //Join private room event
    socket.on('joinPrivate', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          Room.findOne({name: data.room}, (err, res) => {
            if (!err && res) {
              if (data.pw === res.pw || !res.pw) {
                socket.activeRoom = data.room; //Change activeRoom
                socket.allRooms.push(data.room); //Add to list of all the rooms this socket has joined so far
                res.users.forEach(user => {
                  socket.to(user.id).emit('msg', {type: 'userJoined', msg: `${decoded.name} joined the room.`, room: socket.activeRoom});
                });
                res.users.push(data.user);
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
          server.disconnect(socket);
        }
      });
    });
  
    //Leave room event
    socket.on('leave', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          Room.findOne({name: data.room}, (err, res) => {
            if (!err && res) {
              let userFound = false;
              for (let y = 0; y < res.users.length; y++) {
                if (res.users[y].name === decoded.name) {
                  userFound = true;
                }
              }
              if (userFound) {
                for (let x = 0; x < res.users.length; x++) {
                  if (res.users[x].name === decoded.name) {
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
                    socket.to(res.users[x].id).emit('msg', {type: 'userLeft', msg: `${decoded.name} left the room.`, room: res.name});
                  }
                }
              }
              else {
                socket.emit('leave', {type: 'roomNotFound'});
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
          server.disconnect(socket);
        }
      });
    });
  
    //Create room event
    socket.on('create', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
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
              let room;
              if (data.pw) {
                room = new Room({name: data.room, owner: data.user.name, private: true, pw: data.pw, salt: data.salt, welcome: `Welcome to ${data.room}!`});
              }
              else {
                room = new Room({name: data.room, owner: data.user.name, private: true, salt: data.salt, welcome: `Welcome to ${data.room}!`});
              }
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
          server.disconnect(socket);
        }
      });
    })
  
    //Switch event
    socket.on('switch', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
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
          server.disconnect(socket);
        }
      });
    });
  
    //msgInit event
    socket.on('msgInit', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
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
            else if (!err && !res) {
              socket.emit('msgInit', {type: 'error', err: 'Room does not exist.'});
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
            if (!err && res && res.online) {
              let userData = {
                id: res.id,
                pubKey: res.pubKey
              }
              userList.push(userData);
              socket.emit('msgInit', {type: 'success', visible: 'private', userList});
            }
            else if (!err && res && !res.online) {
              socket.emit('msgInit', {type: 'userNotOnline', visible: 'private'});
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
          server.disconnect(socket);
        }
      });
    })
  
    //Message event
    socket.on('msg', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
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
          server.disconnect(socket);
        }
      });
    });
  
    //Welcome message set event
    socket.on('welcome', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          Room.findOne({name: socket.activeRoom}, (err, res) => {
            if (!err && res) {
              if (res.owner === decoded.name) {
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
          server.disconnect(socket);
        }
      });
    });

    //Change room pw init event
    socket.on('changeRoomPwInit', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          Room.findOne({name: socket.activeRoom}, (err, res) => {
            if (!err && res) {
              if (!res.private) {
                socket.emit('changeRoomPwInit', {type: 'public'});
              }
              else if (res.private && res.owner != decoded.name) {
                socket.emit('changeRoomPwInit', {type: 'noPermission'});
              }
              else if (res.private && res.pw) {
                socket.emit('changeRoomPwInit', {type: 'checkPw', salt: res.salt});
              }
              else if (res.private && !res.pw) {
                socket.emit('changeRoomPwInit', {type: 'noPw'});
              }
              else {
                socket.emit('changeRoomPwInit', {type: 'error', err});
              }
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    });

    //Change room pw event
    socket.on('changeRoomPw', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err && data.type === 'checkPw') {
          Room.findOne({name: socket.activeRoom}, (err, res) => {
            if (!err && res && data.oldPw === res.pw && res.private) {
              res.pw = data.newPw;
              res.salt = data.salt;

              res.save(err => {
                if (!err) {
                  socket.emit('changeRoomPw', {type: 'success'});
                }
                else {
                  socket.emit('changeRoomPw', {type: 'error', err});
                }
              });
            }
            else if (!err && res && data.oldPw != res.pw) {
              socket.emit('changeRoomPw', {type: 'wrongPw'});
            }
          });
        }
        else if (!err && data.type === 'noPw') {
          Room.findOne({name: socket.activeRoom}, (err, res) => {
            if (!err && res && res.private && !res.pw) { //Make sure to check for res.pw!
              res.pw = data.newPw;
              res.salt = data.salt;

              res.save(err => {
                if (!err) {
                  socket.emit('changeRoomPw', {type: 'success'});
                }
                else {
                  socket.emit('changeRoomPw', {type: 'error', err});
                }
              });
            }
            else {
              socket.emit('changeRoomPw', {type: 'error'});
            }
          });
        }
        else if (!err && data.type === 'deletePw') {
          Room.findOne({name: socket.activeRoom}, (err, res) => {
            if (!err && res && data.oldPw === res.pw && res.private && res.pw) { //Make sure to check for res.pw
              res.pw = undefined;
              res.salt = undefined;

              res.save(err => {
                if (!err) {
                  socket.emit('changeRoomPw', {type: 'success'});
                }
                else {
                  socket.emit('changeRoomPw', {type: 'error', err});
                }
              });
            }
            else if (!err && res && !res.pw) {
              socket.emit('changeRoomPw', {type: 'success'});
            }
            else {
              socket.emit('changeRoomPw', {type: 'error'});
            }
          });
        }
        else if (!err && res && !res.private) {
          socket.emit('changeRoomPw', {type: 'public'});
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    });
  
    //Delete room init event
    socket.on('deleteRoomInit', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          Room.findOne({name: data.room}, (err, res) => {
            if (!err && res && res.owner === decoded.name) {
              User.findOne({name: decoded.name}, (err, res) => {
                if (!err) {
                  socket.emit('deleteRoomInit', {type: 'success', room: data.room, salt: res.salt});
                }
                else {
                  socket.emit('deleteRoomInit', {type: 'error'});
                }
              })
              
            }
            else if (!err && res && res.owner != decoded.name) {
              socket.emit('deleteRoomInit', {type: 'noPermission'});
            }
            else {
              socket.emit('deleteRoomInit', {type: 'error'});
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    });
  
    //Delete room event
    socket.on('deleteRoom', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          User.findOne({name: decoded.name}, (err, res) => {
            if (!err && res && data.pw === res.pw) {
              Room.findOneAndDelete({name: data.room}, (err, res) => {
                if (!err) {
                  socket.allRooms.splice(socket.allRooms.indexOf(data.room), 1);
                  socket.emit('deleteRoom', {type: 'success', room: data.room});
  
                  res.users.forEach(user => {
                    socket.to(user.id).emit('roomDeleted', {room: data.room});
                  });
                }
                else {
                  sl.log(err);
                }
              })
            }
            else if (!err && res && data.pw != res.pw) {
              socket.emit('deleteRoom', {type: 'wrongPassword'});
            }
            else {
              socket.emit('deleteRoom', {type: 'error'});
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      }) 
    });

    //roomDeleted event
    socket.on('roomDeleted', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          socket.allRooms.splice(socket.allRooms.indexOf(data.room), 1);
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    })
  
    //Change password init event
    socket.on('changePwInit', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          User.findOne({name: decoded.name}, (err, res) => {
            if (!err && res) {
              socket.emit('changePwInit', {type: 'success', salt: res.salt});
            }
            else {
              socket.emit('error', {type: 'error'});
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    });
  
    //Change password event
    socket.on('changePw', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          User.findOne({name: decoded.name}, (err, user) => {
            if (!err && user) {
              if (data.oldPw === user.pw) {
                user.pw = data.newPw;
                user.salt = data.salt;
                user.save(err => {
                  if (!err) {
                    socket.emit('changePw', {type: 'success'});
                  }
                  else {
                    socket.emit('changePw', {type: 'error'});
                  }
                });
              }
              else {
                socket.emit('changePw', {type: 'wrongPassword'});
              }
            }
            else {
              socket.emit('changePw', {type: 'error'});
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    });
  
    //Selfdestruct init event
    socket.on('selfdestructInit', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          User.findOne({name: decoded.name}, (err, user) => {
            if (!err) {
              socket.emit('selfdestructInit', {type: 'success', salt: user.salt});
            }
            else {
              socket.emit('selfdestructInit', {type: 'error'});
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    })
  
    //Selfdestruct event
    socket.on('selfdestruct', data => {
      server.verifyToken(data, socket.id, (err, decoded) => {
        if (!err) {
          User.findOne({name: decoded.name}, (err, user) => {
            if (!err) {
              if (user.pw === data.pw) {
                user.remove(err => {
                  if (!err) {
                    socket.emit('selfdestruct', {type: 'success'});
                    socket.disconnect(true);
                  }
                  socket.emit('selfdestruct', {type: 'error'});
                });
              }
              else {
                socket.emit('selfdestruct', {type: 'wrongPassword'});
              }
            }
            else {
              socket.emit('selfdestruct', {type: 'error'});
            }
          });
        }
        else {
          socket.emit('tokenNotValid');
          server.disconnect(socket);
        }
      });
    });
  
    //Disconnect event
    socket.on('disconnect', () => {
      server.disconnect(socket);
    });
  });
}