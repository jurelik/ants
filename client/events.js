const sl = require('staylow');
const crypto = require('crypto');
const client = require('./client');
const style = require('./style');

module.exports = function(socket) {
  //On connect
  socket.on('connect', () => {
    client.login();
  }).on('connect_error', (err) => {
    sl.log("Can't connect to server.");
  });

  //On login
  socket.on('login', data => {
    if (data.type === 'success') {
      client.session.token = data.token;
      client.session.user.name = data.name;
      client.session.user.id = socket.id;
      client.clear();
      client.addToLog('home', data.welcome, true);
      client.drawLog('home');
      client.home();
      sl.log(style.success('LOGIN SUCCESSFULL.'));
    }
    else if (data.type === 'alreadyOnline') {
      client.login();
      sl.log(style.err('USER ALREADY LOGGED IN.'));
    }
    else if (data.type === 'failed') {
      client.login();
      sl.log(style.err('USERNAME OR PASSWORD INCORRECT'));
    }
    else {
      client.login();
      sl.log(style.err('ERROR: ' + data.err.message));
    }
  });

  //On register
  socket.on('register', data => {
    if (data.type === 'success') {
      client.login();
      sl.log(style.success('ACCOUNT CREATED'));
    }
    else if (data.type === 'userExists') {
      client.login();
      sl.log(style.err('USER ALREADY EXISTS'))
    }
    else if (data.type === 'badUsername') {
      client.login();
      sl.log(style.err('Username can only contain letters, numbers and underscores and needs to be between 3-15 characters long.'));  
    }
    else if (data.type === 'error') {
      client.login();
      sl.log(style.err('Error: ' + data.err.message));
    }
    else {
      client.login();
      sl.log(style.err('Error: Unknown'));
    }
  });

  //On getSalt
  socket.on('getSalt', data => {
    if (data.type === 'success') {
      client.hashLoginPassword(data);
    }
    else if (data.type === 'error') {
      sl.log(style.err('Error: ' + data.err.message));
      client.login();
    }
    else {
      sl.log(style.err('Error: Unknown'));
    }
  });

  //On lsRooms
  socket.on('lsRooms', data => {
    if (data.type === 'success') {
      sl.log(style.ls('PUBLIC ROOMS:'))
      data.rooms.forEach(room => {
        sl.log(style.ls('• ' + room));
      });
      client.home();
    }
    else if (data.type === 'error') {
      sl.log(style.err('Error: ' + data.err.message));
      client.home();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.home();
    }
  });

  //On lsUsers
  socket.on('lsUsers', data => {
    if (data.type === 'success') {
      data.userList.forEach(user => {
        sl.log(style.ls('• ' + user));
      });
    }
    else if (data.type === 'error') {
      sl.log(style.err('Error: ' + data.err.message));
    }
    else {
      sl.log(style.err('Error: Unknown'));
    }
  });

  //On join
  socket.on('join', data => {
    if (data.type === 'success') {
      client.clear();
      client.session.activeRoom = data.room;
      client.session.log[data.room] = {};
      client.session.log[data.room].private = false;
      client.session.log[data.room].msg = [];
      client.session.log[data.room].unread = 0;

      sl.log(`Room successfully joined: ${data.room}`);
      sl.log(style.welcome(data.welcome));
      client.addToLog(data.room, style.welcome(data.welcome), true);

      client.room();
    }
    else if (data.type === 'private') {
      if (data.pw) {
        client.hashRoomPassword(data);
      }
      else {
        socket.emit('joinPrivate', {room: data.room, user: client.session.user, private: true, token: client.session.token});
      }
    }
    else if (data.type === 'alreadyJoined') {
      sl.log('Room already joined, please use :switch to switch between rooms.');
      client.session.home ? client.home() : client.room();
    }
    else if (data.type === 'wrongPassword') {
      sl.log('The password you entered is wrong.');
      client.session.home ? client.home() : client.room();
    }
    else if (data.type === 'notFound') {
      sl.log('Room not found');
      client.session.home ? client.home() : client.room();
    }
    else if (data.type === 'error') {
      sl.log(style.err('Error: ' + data.err.message));
      client.session.home ? client.home() : client.room();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.session.home ? client.home() : client.room();
    }
  });

  //On leave
  socket.on('leave', data => {
    if (data.type === 'success') {
      delete client.session.log[data.room];
      client.clear();
      client.drawLog('home');
      client.home();
      sl.log(`You have left room '${data.room}'`);
    }
    else if (data.type === 'roomNotFound') {
      sl.log(`You can't leave a room you never joined.`);
      client.session.home ? client.home() : client.room();
    }
    else if (data.type === 'error') {
      sl.log('Error: ' + data.err.message);
      client.session.home ? client.home() : client.room();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.session.home ? client.home() : client.room();
    }
  });

  //On create
  socket.on('create', data => {
    if (data.type === 'success') {
      sl.log(`Room successfully created: ${data.room}`);
    }
    else if (data.type === 'roomExists') {
      sl.log(`Room already exists`);
    }
    else if (data.type === 'badName') {
      sl.log('Username can only contain letters, numbers and underscores and needs to be atleast 3 characters long.');
    }
    else if (data.type === 'error') {
      sl.log(style.err('Error: ' + data.err.message));
    }
    else {
      sl.log(style.err('Error: Unknown'));
    }
  })

  //On switch
  socket.on('switch', data => {
    if (data.type === 'success') {
      client.drawLog(data.room);
      client.session.activeRoom = data.room;
      client.session.log[data.room].unread = 0;
      client.room();
    }
    else if (data.type === 'failed') {
      sl.log('Please join a room first before using :switch');
      client.room();
    }
    else {
      sl.log('Error: Unknown');
      client.room();
    }
  });

  //On msgInit
  socket.on('msgInit', data => {
    if (data.type === 'success' && data.visible === 'public') {
      data.userList.forEach(user => {
        const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(client.session.msg));
        socket.emit('msg', {msg, dest: user.id, visible: 'public', token: client.session.token});
      });
      client.session.msg = ''; //Delete message from memory after it is sent
      client.session.to = ''; //Delete 'to' value from memory after message is sent
    }
    else if (data.type === 'success' && data.visible === 'private') {
      const self = {
        id: client.session.user.id,
        pubKey: client.session.user.pubKey
      };
      data.userList.push(self);
      data.userList.forEach(user => {
        const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(client.session.msg));
        socket.emit('msg', {msg, dest: user.id, visible: 'private', to: client.session.to, token: client.session.token});
      });
      client.session.msg = ''; //Delete message from memory after it is sent
      client.session.to = ''; //Delete 'to' value from memory after message is sent
    }
    else if (data.type === 'notFound' && data.visible === 'private') {
      sl.log('User not found.');
    }
    else if (data.type === 'userNotOnline' && data.visible === 'private') {
      sl.log('User not online.');
    }
    else if (data.type === 'error') {
      sl.log(style.err('Error: ' + data.err.message))
    }
    else {
      sl.log(style.err('Error: Unknown'));
    }
  });

  //On message
  socket.on('msg', data => {
    if (data.type === 'success' && data.visible === 'public') {
      if(client.session.activeRoom === data.room) {
        const msg = crypto.privateDecrypt(client.session.privateKey, data.msg);
        sl.log(`${style.user(data.from)}: ${msg.toString()}`);
        client.addToLog(data.room, `${style.user(data.from)}: ${msg.toString()}`, true);
      }
      else {
        const msg = crypto.privateDecrypt(client.session.privateKey, data.msg);
        client.addToLog(data.room, `${style.user(data.from)}: ${msg.toString()}`, false);
      }
    }
    else if (data.type === 'success' && data.visible === 'private') {
      const msg = crypto.privateDecrypt(client.session.privateKey, data.msg);
      if (!data.self) {
        sl.log(`${style.user('PRIVATE')} from ${style.user(data.from)}: ${msg.toString()}`);
        client.addToLog(data.from, `${style.user('PRIVATE')} from ${style.user(data.from)}: ${msg.toString()}`, true);
      }
      else {
        sl.log(`${style.user('PRIVATE')} to ${style.user(data.to)}: ${msg.toString()}`);
        client.addToLog(data.to, `${style.user('PRIVATE')} to ${style.user(data.to)}: ${msg.toString()}`, true);
      }
    }
    else if (data.type === 'userJoined') {
      if (client.session.activeRoom === data.room) {
        sl.log(style.joined(data.msg));
        client.addToLog(data.room, style.joined(data.msg), true);
      }
      else {
        client.addToLog(data.room, style.joined(data.msg), false);
      }
    }
    else if (data.type === 'userLeft') {
      if (client.session.activeRoom === data.room) {
        sl.log(style.left(data.msg));
        client.addToLog(data.room, style.left(data.msg), true);
      }
      else {
        client.addToLog(data.room, style.left(data.msg), false);
      }
    }
    else if (data.type === 'failed') {
      sl.log(style.err('Error: ' + data.err.message));
    }
    else {
      sl.log(style.err('Error: Unknown'));
    }
  });

  //On deleteRoomInit
  socket.on('deleteRoomInit', data => {
    if (data.type === 'success') {
      sl.prompt(`This will delete the room '${data.room}'. Are you sure you want to proceed (y/n): `, res => {
        if (res === 'y') {
          sl.prompt('Enter your user password: ', true, res => {
            let pw1 = res;
            sl.prompt('Confirm password: ', true, res => {
              if (pw1 === res) {
                crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
                  if (!err) {
                    socket.emit('deleteRoom', {room: data.room, pw: derivedKey.toString('base64'), token: client.session.token});
                  }
                  else {
                    sl.log('Error: ' + err.message);
                    client.room();
                  }
                });
              }
              else {
                sl.log("The passwords you entered didn't match. Aborting delete.");
                client.room();
              }
            });
          });
        }
        else if (res === 'n') {
          sl.log('Aborting delete.');
          client.room();
        }
        else {
          sl.log('Command not recognized.');
          client.room();
        }
      });
    }
    else if (data.type === 'noPermission') {
      sl.log("You don't have permission to delete this room.");
      client.room();
    }
    else if (data.type === 'error') {
      sl.log(style.err('Something went wrong.'));
      client.room();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.room();
    }
  });

  //On deleteRoom
  socket.on('deleteRoom', data => {
    if (data.type === 'success') {
      sl.log('Room successfully deleted.');
      client.home();
    }
    else if (data.type === 'wrongPassword') {
      sl.log('The password you entered was wrong. Aborting delete.');
      client.room();
    }
    else if (data.type === 'error') {
      sl.log('Something went wrong.');
      client.room();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.room();
    }
  });

  //On roomDeleted
  socket.on('roomDeleted', data => {
    if (client.session.activeRoom === data.room) {
      sl.log(`Room has been deleted.`);
      client.session.activeRoom = '';
    }
    else {
      sl.log(`Room '${data.room}' has been deleted.`);
    }
  });

  //On changePwInit
  socket.on('changePwInit', data => {
    if (data.type === 'success') {
      sl.prompt('Please enter your old password: ', true, res => {
        let pw1 = res;
        sl.prompt('Confirm old password: ', true, res => {
          if (pw1 === res) {
            crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
              if (!err) {
                let oldPw = derivedKey.toString('base64');
                sl.prompt('Enter new password: ', true, res => {
                  //Hash password before sending to server
                  let salt = crypto.randomBytes(128).toString('base64');
                  crypto.pbkdf2(res, salt, 100000, 128, 'sha512', (err, derivedKey) => {
                    if (!err) {
                      let newPw = derivedKey.toString('base64');
                      socket.emit('changePw', {oldPw, newPw, salt, token: client.session.token});
                    }
                    else {
                      sl.log('Error: ' + err);
                      client.home();
                    }
                  });
                });
              }
              else {
                sl.log('Error: ' + err.message);
                client.home();
              }
            });
          }
          else {
            sl.log("The passwords you entered didn't match.");
            client.home();
          }
        });
      });
    }
    else if (data.type === 'error') {
      sl.log('Something went wrong, please try again.');
      client.home();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.home();
    }
  });

  //On changePw
  socket.on('changePw', data => {
    if (data.type === 'success') {
      sl.log('Password successfully changed.');
      client.home();
    }
    else if (data.type === 'wrongPassword') {
      sl.log('The password you entered was not correct. Please try again.');
      client.home();
    }
    else if (data.type === 'error') {
      sl.log(style.err('Something went wrong.'));
      client.home();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.home();
    }
  });

  //On selfdestructInit
  socket.on('selfdestructInit', data => {
    if (data.type === 'success') {
      sl.prompt('Enter password: ', true, res => {
        const pw1 = res;
        sl.prompt('Confirm password: ', true, res => {
          if (pw1 === res) {
            crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
              if (!err) {
                socket.emit('selfdestruct', {pw: derivedKey.toString('base64'), token: client.session.token});
              }
              else {
                sl.log('Error: ' + err.message);
                client.home();
              }
            });
          }
          else {
            sl.log('Passwords did not match. Aborting selfdestruct.');
            client.home();
          }
        });
      });
    }
    else if (data.type === 'error') {
      sl.log('Something went wrong.');
      client.home();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.home();
    }
  });

  //On selfdestruct
  socket.on('selfdestruct', data => {
    if (data.type === 'success') {
      sl.log('Account successfully deleted.');
      process.exit();
    }
    else if (data.type === 'wrongPassword') {
      sl.log('The password you entered was wrong. Aborting selfdestruct.');
      client.home();
    }
    else if (data.type === 'error') {
      sl.log(style.err('Something went wrong.'));
      client.home();
    }
    else {
      sl.log(style.err('Error: Unknown'));
      client.home();
    }
  });

  //On changeRoomPwInit
  socket.on('changeRoomPwInit', data => {
    if (data.type === 'public') {
      sl.log(`Public rooms can't have a password.`);
      client.room();
    }
    else if (data.type === 'checkPw') {
      sl.prompt('Enter old room password: ', true, res => {
        const oldPw = res;
        sl.prompt('Enter new password: ', true, res => {
          const newPw = res;
          sl.prompt('Confirm new password: ', true, res => {
            if (newPw === res) {
              crypto.pbkdf2(oldPw, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
                const hashedOldPw = derivedKey.toString('base64');
                let salt = crypto.randomBytes(128).toString('base64');

                if (!err) {
                  crypto.pbkdf2(newPw, salt, 100000, 128, 'sha512', (err, derivedKey) => {
                    if (!err && newPw != '') {
                      socket.emit('changeRoomPw', {type: 'checkPw', oldPw: hashedOldPw, newPw: derivedKey.toString('base64'), salt, token: client.session.token});
                    }
                    else if (!err && newPw === '') { //If you remove this, setting an empty password will still prompt the user for password - feel free to do it, not recommended though
                      socket.emit('changeRoomPw', {type: 'deletePw', oldPw: hashedOldPw, newPw: derivedKey.toString('base64'), salt, token: client.session.token});
                    }
                    else {
                      sl.log('Error: ' + err);
                      client.room();
                    }
                  });
                }
                else {
                  sl.log('Error: ' + err);
                  client.room();
                }
              });
            }
            else {
              sl.log(`The passwords you entered don't match. Aborting password change.`);
              client.room();
            }
          });
        })
      });
    }
    else if (data.type === 'noPw') {
      sl.prompt('Enter new password: ', true, res => {
        const newPw = res;
        sl.prompt('Confirm password: ', true, res => {
          if (newPw === res) {
            let salt = crypto.randomBytes(128).toString('base64');
            crypto.pbkdf2(newPw, salt, 100000, 128, 'sha512', (err, derivedKey) => {
              if (!err && newPw != '') {
                socket.emit('changeRoomPw', {type: 'noPw', newPw: derivedKey.toString('base64'), salt, token: client.session.token});
              }
              else if (!err && newPw === '') { //If you remove this, setting an empty password will still prompt the user for password - feel free to do it, not recommended though
                socket.emit('changeRoomPw', {type: 'deletePw', newPw: derivedKey.toString('base64'), salt, token: client.session.token});
              }
              else {
                sl.log('Error: ' + err);
                client.room();
              }
            });
          }
          else {
            sl.log(`Passwords you entered didn't match. Aborting password change.`);
            client.room();
          }
        });
      });
    }
    else if (data.type === 'noPermission') {
      sl.log('You do not have the permission to change the room password.')
      client.room();
    }
    else if (data.type === 'error') {
      sl.log('Error: ' + data.error.message);
      client.room();
    }
    else {
      sl.log('Error: Unknown');
      client.room();
    }
  });

  //On changeRoomPw
  socket.on('changeRoomPw', data => {
    if (data.type === 'success') {
      sl.log('Password successfully changed.');
      client.room();
    }
    else if (data.type === 'wrongPw') {
      sl.log('Old password you entered is wrong. Aborting password change.');
      client.room();
    }
    else if (data.type === 'error') {
      if (data.err) {
        sl.log('Error: ' + data.err.message);
        client.room();
      }
      else {
        sl.log('Something went wrong.');
        client.room();
      }
    }
    else if (data.type === 'public') {
      sl.log(`Public rooms can't have a password.`);
      client.room();
    }
    else {
      sl.log('Error: Unknown');
      client.room();
    }
  });

  //On welcome
  socket.on('welcome', data => {
    if (data.type === 'success') {
      sl.log('Welcome message successfully changed.');
    }
    else if (data.type === 'badOwner') {
      sl.log('You do not have permission to change the welcome message.')
    }
    else if (data.type === 'error') {
      sl.log(style.error('Error: ' + data.err.message));
    }
    else {
      sl.log(style.err('Error: Unknown'));
    }
  });

  //On tokenNotValid
  socket.on('tokenNotValid', () => {
    sl.log(style.err('Token is not valid, please log in again.'));
    client.login();
  });
}
