const sl = require('staylow');
const io = require('socket.io-client');
const crypto = require('crypto');
const style = require('./style');

sl.options({
  defaultPrompt: '',
  globalMask: '*',
  logOnEnter: 'false'
});
sl.pause();

let session = {
  activeRoom: '',
  connected: false,
  log: {},
  user: {}
}

module.exports = {
  session,
  login,
  register,
  home,
  room,
  addToLog,
  drawLog,
  hashLoginPassword,
  hashRegisterPassword,
  hashRoomPassword,
  generateRSAKeyPair,
  createRoom,
  setTitle,
  clear
};

const socket = io('http://localhost:4000', {reconnectionAttempts: 3});
const events = require('./events')(socket);
// let exec = require('child_process').exec;

// exec('afplay /System/Library/Sounds/Pop.aiff', (err, stdout, stderr) => {
//   // sl.log(stdout);
// });



// //
// //SOCKET EVENTS
// //

// //On connect
// socket.on('connect', () => {
//   sl.log('Connection made.');
//   login();
// }).on('connect_error', (err) => {
//   sl.log("Can't connect to server.");
// });

// //On login
// socket.on('login', data => {
//   if (data.type === 'success') {
//     session.token = data.token;
//     session.user.name = data.name;
//     session.user.id = socket.id;
//     sl.log('Login successful');
//     clear();
//     drawLog('home');
//     home();
//   }
//   else if (data.type === 'alreadyOnline') {
//     sl.log('User already logged in.');
//     login();
//   }
//   else if (data.type === 'failed') {
//     sl.log('Username or password incorrect.');
//     login();
//   }
//   else {
//     sl.log('Error: ' + data.err.message);
//   }
// });

// //On register
// socket.on('register', data => {
//   if (data.type === 'success') {
//     sl.log('Account created');
//     login();
//   }
//   else if (data.type === 'userExists') {
//     sl.log('User already exists')
//     register();
//   }
//   else if (data.type === 'badUsername') {
//     clear();
//     sl.log('Username can only contain letters, numbers and underscores and needs to be atleast 3 characters long.');
//     register();
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//     register();
//   }
//   else {
//     sl.log('Error: Unknown');
//     register();
//   }
// });

// //On getSalt
// socket.on('getSalt', data => {
//   if (data.type === 'success') {
//     hashLoginPassword(data);
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//     login();
//   }
//   else {
//     sl.log('Error: Unknown');
//   }
// });

// //On lsRooms
// socket.on('lsRooms', data => {
//   if (data.type === 'success') {
//     sl.log(data.rooms);
//     home();
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//     home();
//   }
//   else {
//     sl.log('Error: Unknown');
//     home();
//   }
// });

// //On lsUsers
// socket.on('lsUsers', data => {
//   if (data.type === 'success') {
//     sl.log(data.userList);
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//   }
//   else {
//     sl.log('Error: Unknown');
//   }
// });

// //On join
// socket.on('join', data => {
//   if (data.type === 'success') {
//     clear();
//     sl.log(`Room successfully joined: ${data.room}`);
//     sl.log(data.welcome);
//     session.activeRoom = data.room;
//     session.log[data.room] = {};
//     session.log[data.room].msg = [];
//     session.log[data.room].unread = 0;
//     room();
//   }
//   else if (data.type === 'private') {
//     hashRoomPassword(data);
//   }
//   else if (data.type === 'alreadyJoined') {
//     sl.log('Room already joined, please use :switch to switch between rooms.');
//     session.home ? home() : room();
//   }
//   else if (data.type === 'wrongPassword') {
//     sl.log('The password you entered is wrong.');
//     session.home ? home() : room();
//   }
//   else if (data.type === 'notFound') {
//     sl.log('Room not found');
//     session.home ? home() : room();
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//     session.home ? home() : room();
//   }
//   else {
//     sl.log('Error: Unknown');
//     session.home ? home() : room();
//   }
// });

// //On leave
// socket.on('leave', data => {
//   if (data.type === 'success') {
//     sl.log(`You have left room '${data.room}'`);
//     delete session.log[data.room];
//     session.activeRoom = '';
//     home();
//   }
//   else if (data.type === 'roomNotFound') {
//     sl.log(`You can't leave a room you never joined.`);
//     room();
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//     room();
//   }
//   else {
//     sl.log('Error: Unknown');
//     room();
//   }
// });

// //On create
// socket.on('create', data => {
//   if (data.type === 'success') {
//     sl.log(`Room successfully created: ${data.room}`);
//   }
//   else if (data.type === 'roomExists') {
//     sl.log(`Room already exists`);
//   }
//   else if (data.type === 'badName') {
//     sl.log('Username can only contain letters, numbers and underscores and needs to be atleast 3 characters long.');
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message);
//   }
//   else {
//     sl.log('Error: Unknown');
//   }
// })

// //On switch
// socket.on('switch', data => {
//   if (data.type === 'success') {
//     drawLog(data.room);
//     session.activeRoom = data.room;
//     session.log[data.room].unread = 0;
//     room();
//   }
//   else if (data.type === 'failed') {
//     sl.log('Please join a room first before using :switch');
//     room();
//   }
//   else {
//     sl.log('Error: Unknown');
//     room();
//   }
// });

// //On msgInit
// socket.on('msgInit', data => {
//   if (data.type === 'success' && data.visible === 'public') {
//     data.userList.forEach(user => {
//       const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(session.msg));
//       socket.emit('msg', {msg, dest: user.id, visible: 'public', token: session.token});
//     });
//     session.msg = ''; //Delete message from memory after it is sent
//     session.to = ''; //Delete 'to' value from memory after message is sent
//   }
//   else if (data.type === 'success' && data.visible === 'private') {
//     const self = {
//       id: session.user.id,
//       pubKey: session.user.pubKey
//     };
//     data.userList.push(self);
//     data.userList.forEach(user => {
//       const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(session.msg));
//       socket.emit('msg', {msg, dest: user.id, visible: 'private', to: session.to, token: session.token});
//     });
//     session.msg = ''; //Delete message from memory after it is sent
//     session.to = ''; //Delete 'to' value from memory after message is sent
//   }
//   else if (data.type === 'userJoined') {
//     data.userList.forEach(user => {
//       const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(`${data.from} joined the room.`));
//       socket.emit('msg', {msg, dest: user.id, visible: 'userJoined', token: session.token});
//     });
//   }
//   else if (data.type === 'notFound' && data.visible === 'private') {
//     sl.log('User not found.');
//   }
//   else if (data.type === 'userNotOnline' && data.visible === 'private') {
//     sl.log('User not online.');
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ' + data.err.message)
//   }
//   else {
//     sl.log('Error: Unknown');
//   }
// });

// //On message
// socket.on('msg', data => {
//   if (data.type === 'success' && data.visible === 'public') {
//     if(session.activeRoom === data.room) {
//       const msg = crypto.privateDecrypt(session.privateKey, data.msg);
//       sl.log(`${chalk.bold(data.from)}: ${msg.toString()}`);
//       addToLog(data.room, `${chalk.bold(data.from)}: ${msg.toString()}`, true);
//     }
//     else {
//       const msg = crypto.privateDecrypt(session.privateKey, data.msg);
//       addToLog(data.room, `${chalk.bold(data.from)}: ${msg.toString()}`, false);
//     }
//   }
//   else if (data.type === 'success' && data.visible === 'private') {
//     const msg = crypto.privateDecrypt(session.privateKey, data.msg);
//     if (!data.self) {
//       sl.log(`${chalk.bold('PRIVATE')} from ${chalk.bold(data.from)}: ${msg.toString()}`);
//       addToLog(data.from, `${chalk.bold('PRIVATE')} from ${chalk.bold(data.from)}: ${msg.toString()}`, true);
//     }
//     else {
//       sl.log(`${chalk.bold('PRIVATE')} to ${chalk.bold(data.to)}: ${msg.toString()}`);
//       addToLog(data.to, `${chalk.bold('PRIVATE')} to ${chalk.bold(data.to)}: ${msg.toString()}`, true);
//     }
//   }
//   else if (data.type === 'userJoined') {
//     if (session.activeRoom === data.room) {
//       sl.log(data.msg);
//       addToLog(data.room, data.msg, true);
//     }
//     else {
//       addToLog(data.room, data.msg, false);
//     }
//   }
//   else if (data.type === 'userLeft') {
//     if (session.activeRoom === data.room) {
//       sl.log(data.msg);
//       addToLog(data.room, data.msg, true);
//     }
//     else {
//       addToLog(data.room, data.msg, false);
//     }
//   }
//   else if (data.type === 'failed') {
//     sl.log('Error: ' + data.err.message);
//   }
//   else {
//     sl.log('Error: Unknown');
//   }
// });

// //On deleteRoomInit
// socket.on('deleteRoomInit', data => {
//   if (data.type === 'success') {
//     sl.prompt(`This will delete the room '${data.room}'. Are you sure you want to proceed (y/n): `, res => {
//       if (res === 'y') {
//         sl.prompt('Enter your user password: ', true, res => {
//           let pw1 = res;
//           sl.prompt('Confirm password: ', true, res => {
//             if (pw1 === res) {
//               crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
//                 if (!err) {
//                   socket.emit('deleteRoom', {room: data.room, pw: derivedKey.toString('base64'), token: session.token});
//                 }
//                 else {
//                   sl.log('Error: ' + err.message);
//                   room();
//                 }
//               });
//             }
//             else {
//               sl.log("The passwords you entered didn't match. Aborting delete.");
//               room();
//             }
//           });
//         });
//       }
//       else if (res === 'n') {
//         sl.log('Aborting delete.');
//         room();
//       }
//       else {
//         sl.log('Command not recognized.');
//         room();
//       }
//     });
//   }
//   else if (data.type === 'noPermission') {
//     sl.log("You don't have permission to delete this room.");
//     room();
//   }
//   else if (data.type === 'error') {
//     sl.log('Something went wrong.');
//     room();
//   }
//   else {
//     sl.log('Error: Unknown');
//     room();
//   }
// });

// //On deleteRoom
// socket.on('deleteRoom', data => {
//   if (data.type === 'success') {
//     sl.log('Room successfully deleted.');
//     home();
//   }
//   else if (data.type === 'wrongPassword') {
//     sl.log('The password you entered was wrong. Aborting delete.');
//     room();
//   }
//   else if (data.type === 'error') {
//     sl.log('Something went wrong.');
//     room();
//   }
//   else {
//     sl.log('Error: Unknown');
//     room();
//   }
// });

// //On roomDeleted
// socket.on('roomDeleted', data => {
//   if (session.activeRoom === data.room) {
//     sl.log(`Room has been deleted.`);
//     session.activeRoom = '';
//   }
//   else {
//     sl.log(`Room '${data.room}' has been deleted.`);
//   }
// });

// //On changePwInit
// socket.on('changePwInit', data => {
//   if (data.type === 'success') {
//     sl.prompt('Please enter your old password: ', true, res => {
//       let pw1 = res;
//       sl.prompt('Confirm old password: ', true, res => {
//         if (pw1 === res) {
//           crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
//             if (!err) {
//               let oldPw = derivedKey.toString('base64');
//               sl.prompt('Enter new password: ', true, res => {
//                 //Hash password before sending to server
//                 let salt = crypto.randomBytes(128).toString('base64');
//                 crypto.pbkdf2(res, salt, 100000, 128, 'sha512', (err, derivedKey) => {
//                   if (!err) {
//                     let newPw = derivedKey.toString('base64');
//                     socket.emit('changePw', {oldPw, newPw, salt, token: session.token});
//                   }
//                   else {
//                     sl.log('Error: ' + err);
//                     home();
//                   }
//                 });
//               });
//             }
//             else {
//               sl.log('Error: ' + err.message);
//               home();
//             }
//           });
//         }
//         else {
//           sl.log("The passwords you entered didn't match.");
//           home();
//         }
//       });
//     });
//   }
//   else if (data.type === 'error') {
//     sl.log('Something went wrong, please try again.');
//     home();
//   }
//   else {
//     sl.log('Error: Unknown');
//     home();
//   }
// });

// //On changePw
// socket.on('changePw', data => {
//   if (data.type === 'success') {
//     sl.log('Password successfully changed.');
//     home();
//   }
//   else if (data.type === 'wrongPassword') {
//     sl.log('The password you entered was not correct. Please try again.');
//     home();
//   }
//   else if (data.type === 'error') {
//     sl.log('Something went wrong.');
//     home();
//   }
//   else {
//     sl.log('Error: Unknown');
//     home();
//   }
// });

// //On selfdestructInit
// socket.on('selfdestructInit', data => {
//   if (data.type === 'success') {
//     sl.prompt('Enter password: ', true, res => {
//       const pw1 = res;
//       sl.prompt('Confirm password: ', true, res => {
//         if (pw1 === res) {
//           crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
//             if (!err) {
//               socket.emit('selfdestruct', {pw: derivedKey.toString('base64'), token: session.token});
//             }
//             else {
//               sl.log('Error: ' + err.message);
//               home();
//             }
//           });
//         }
//         else {
//           sl.log('Passwords did not match. Aborting selfdestruct.');
//           home();
//         }
//       });
//     });
//   }
//   else if (data.type === 'error') {
//     sl.log('Something went wrong.');
//     home();
//   }
//   else {
//     sl.log('Error: Unknown');
//     home();
//   }
// });

// //On selfdestruct
// socket.on('selfdestruct', data => {
//   if (data.type === 'success') {
//     sl.log('Account successfully deleted.');
//     process.exit();
//   }
//   else if (data.type === 'wrongPassword') {
//     sl.log('The password you entered was wrong. Aborting selfdestruct.');
//     home();
//   }
//   else if (data.type === 'error') {
//     sl.log('Something went wrong.');
//     home();
//   }
//   else {
//     sl.log('Error: Unknown');
//     home();
//   }
// });

// //On welcome
// socket.on('welcome', data => {
//   if (data.type === 'success') {
//     sl.log('Welcome message successfully changed.');
//   }
//   else if (data.type === 'badOwner') {
//     sl.log('You do not have permission to change the welcome message.')
//   }
//   else if (data.type === 'error') {
//     sl.log('Error: ', data.err.message);
//   }
//   else {
//     sl.log('Error: Unknown');
//   }
// });

// //On tokenNotValid
// socket.on('tokenNotValid', () => {
//   sl.log('Token is not valid, please log in again.');
//   login();
// });

//
//Function declarations
//

//Login
function login() {
  sl.resume();
  setTitle('ants');
  if (session.connected === false) {
    for (let x = 0; x < process.stdout.rows - 18; x++) {
      sl.log('');
    }
    session.log.home = {};
    session.log.home.msg = [];
    session.log.home.unread = 0;
    sl.log(`
  

  
             ,
    _,-'\\   /|   .    .    /\`.
_,-'     \\_/_|_  |\\   |\`. /   \`._,--===--.__
^       _/"/  " \\ : \\__|_ /.   ,'    :.  :. .\`-._
      // ^   /7 t'""    "\`-._/ ,'\\   :   :  :   .\`.
      Y      L/ )\         ]],'    \\  :   :  :   :  \`.
      |        /  \`.n_n_n,','\\_    \\ ;   ;  ;   ;  _>
      |__    ,'     |  \\\`-'    \`-.__\\_______.==---'
     //  \`""\\\\      |   \\            \\
     \\|     |/      /    \\            \\
                   /     |             \`.
                  /      |               ^
                 ^       |                         アリ`)
    sl.log('Welcome to ants. To create a new account please enter :n');
    addToLog('home', `
      

  
             ,
    _,-'\\   /|   .    .    /\`.
_,-'     \\_/_|_  |\\   |\`. /   \`._,--===--.__
^       _/"/  " \\ : \\__|_ /.   ,'    :.  :. .\`-._
      // ^   /7 t'""    "\`-._/ ,'\\   :   :  :   .\`.
      Y      L/ )\         ]],'    \\  :   :  :   :  \`.
      |        /  \`.n_n_n,','\\_    \\ ;   ;  ;   ;  _>
      |__    ,'     |  \\\`-'    \`-.__\\_______.==---'
     //  \`""\\\\      |   \\            \\
     \\|     |/      /    \\            \\
                   /     |             \`.
                  /      |               ^
                 ^       |                         アリ`, true);
    session.connected = true
}
  sl.prompt('Enter username: ', res => {
    if (res.startsWith(':')) {
      if(res === ':n') {
        clear();
        register();
      }
      else if (res === ':q' || res === 'Q') {
        sl.log('Shutting down.');
        process.exit();
      }
      else {
        sl.log('Command not recognized.');
        login();
      }
    }
    else {
      socket.emit('getSalt', {name: res});
    }
  });
};

//Register
function register() {
  sl.log(`
  

  
             ,
    _,-'\\   /|   .    .    /\`.
_,-'     \\_/_|_  |\\   |\`. /   \`._,--===--.__
^       _/"/  " \\ : \\__|_ /.   ,'    :.  :. .\`-._
      // ^   /7 t'""    "\`-._/ ,'\\   :   :  :   .\`.
      Y      L/ )\         ]],'    \\  :   :  :   :  \`.
      |        /  \`.n_n_n,','\\_    \\ ;   ;  ;   ;  _>
      |__    ,'     |  \\\`-'    \`-.__\\_______.==---'
     //  \`""\\\\      |   \\            \\
     \\|     |/      /    \\            \\
                   /     |             \`.
                  /      |               ^
                 ^       |                         アリ`)
  sl.log('REGISTER');
  sl.prompt('Enter username: ', res => {
    let regex = /^\w+$/;
    let name = res;

    if(regex.test(name) && name.length >= 3 && name.length <= 15) {
      hashRegisterPassword(name);
    }
    else if (res === ':q' || res === 'Q') {
      sl.log('Shutting down.');
      process.exit();
    }
    else {
      clear();
      sl.log('Username can only contain letters, numbers and underscores and needs to be between 3-15 characters long.');
      register();
    }
  });
}

//Home
function home() {
  session.home = true;
  setTitle('home');
  sl.prompt('', false, res => {
    if (res === ':ls') {
      socket.emit('lsRooms', {token: session.token});
    }
    else if (res.startsWith(':join ')) {
      let room = res.slice(6);
      socket.emit('join', {room, user: session.user, token: session.token});
    }
    else if (res.startsWith(':create ')) {
      createRoom(res);
    }
    else if (res.startsWith(':p ')) {
      let array = res.split(' ');
      let user = array[1];
      let msg = array.slice(2).join(' ');
      sl.addToHistory(`:p ${user} `);
      session.msg = msg;
      session.to = user;
      socket.emit('msgInit', {dest: user, visible: 'private', token: session.token})
      home();
    }
    else if (res.startsWith(':switch ')) {
      let _room = res.slice(8);
      socket.emit('switch', {room: _room, token: session.token});
    }
    else if (res.startsWith(':s ')) {
      let _room = res.slice(3);
      socket.emit('switch', {room: _room, token: session.token});
    }
    else if (res === ':check' || res === ':c') {
      Object.keys(session.log).forEach(room => {
        if (room != 'home') {
          sl.log(`- ${room} (${session.log[room].unread} unread messages)`);
        }
      });
      home();
    }
    else if (res === ':help' || res === ':h') {
      sl.log(`You can use the following commands while on the home screen:
• :ls - list all public rooms
• :join ${style.gray('[room]')} - join ${style.gray('[room]')}
• :create ${style.gray('[room]')} - create ${style.gray('[room]')}
• :c or :check - check joined rooms for unread messages
• :s ${style.gray('[room]')} or :switch ${style.gray('[room]')} - switch screen to ${style.gray('[room]')}
• :p ${style.gray('[user]')} ${style.gray('[message]')} - send a private ${style.gray('[message]')} to ${style.gray('[user]')}
• :changepw - change password
• :selfdestruct - delete account
• :q - exit ants`);
      home();
    }
    else if (res === ':changepw') {
      socket.emit('changePwInit', {token: session.token});
    }
    else if (res === ':selfdestruct') {
      sl.prompt('This will permanently delete your account. Are you sure you want to proceed (y/n): ', res => {
        if (res === 'y') {
          socket.emit('selfdestructInit', {token: session.token});
        }
        else if ('n') {
          sl.log('Aborting selfdestruct.');
          home();
        }
        else {
          sl.log('Command not recognized. Aborting selfdestruct.');
          home();
        }
      });
    }
    else if (res === ':q' || res === 'Q') {
      sl.log('Shutting down.');
      process.exit();
    }
    else {
      sl.log(`Command not found, type ':h' for help`);
      home();
    }
  });
};

//Room
function room() {
  session.home = false;
  setTitle(session.activeRoom);
  sl.prompt('', res => {
    if (res.startsWith(':')) {
      if (res.startsWith(':join ')) {
        let room = res.slice(6);
        socket.emit('join', {room, user: session.user, token: session.token});
      }
      else if (res === ':ls') {
        socket.emit('lsUsers', {token: session.token});
        room();
      }
      else if (res === ':check' || res === ':c') {
        Object.keys(session.log).forEach(room => {
          if (room != 'home') {
            sl.log(style.ls(`• ${room} (${session.log[room].unread} unread messages)`));
          }
        });
        room();
      }
      else if (res.startsWith(':switch ')) {
        let _room = res.slice(8);
        socket.emit('switch', {room: _room, token: session.token});
      }
      else if (res.startsWith(':s ')) {
        let _room = res.slice(3);
        socket.emit('switch', {room: _room, token: session.token});
      }
      else if (res.startsWith(':p ')) {
        let array = res.split(' ');
        let user = array[1];
        let msg = array.slice(2).join(' ');
        sl.addToHistory(`:p ${user} `);
        session.msg = msg;
        session.to = user;
        socket.emit('msgInit', {dest: user, visible: 'private', token: session.token})
        room();
      }
      else if (res === ':home') {
        clear();
        drawLog('home');
        home();
      }
      else if (res.startsWith(':log ')) {
        let user = res.slice(5);
        if (session.log[user]) {
          session.log[user].msg.forEach(msg => {
            sl.log(msg);
          });
          room();
        }
        else {
          sl.log('Log not found');
          room();
        }
      }
      else if (res.startsWith(':leave')) {
        socket.emit('leave', {room: session.activeRoom, token: session.token});
      }
      else if (res === ':q' || res === 'Q') {
        sl.log('Shutting down.');
        process.exit();
      }
      else if (res === ':help' || res === ':h') {
        sl.log(`You can use the following commands while in a room:
• :ls - list all users in the room
• :join ${style.gray('[room]')} - join ${style.gray('[room]')}
• :c or :check - check joined rooms for unread messages
• :s ${style.gray('[room]')} or :switch ${style.gray('[room]')} - switch screen to ${style.gray('[room]')}
• :p ${style.gray('[user]')} ${style.gray('[message]')} - send a private ${style.gray('[message]')} to ${style.gray('[user]')}
• :home - go to home screen
• :log ${style.gray('[user]')} - log private messages to/from ${style.gray('[user]')}
• :welcome ${style.gray('[message]')} - set room welcome ${style.gray('[message]')} (only for owner)
• :delete - delete room (only for owner)
• :leave - leave current room
• :q - exit ants`);
        room();
      }
      else if (res.startsWith(':welcome ')) {
        let msg = res.slice(9);
        socket.emit('welcome', {msg, token: session.token});
        room();
      }
      else if (res === ':changeroompw') {
        socket.emit('changeRoomPwInit', {token: session.token});
      }
      else if (res === ':delete') {
        socket.emit('deleteRoomInit', {room: session.activeRoom, token: session.token});
      }
      else {
        sl.log(`Command not found, type ':h' for help`);
        room();
      }
    }
    else {
      session.msg = res;
      socket.emit('msgInit', {visible: 'public', token: session.token});
      room();
    }
  })
};

//Add message to log
function addToLog(room, msg, active) {
  if (session.log[room] && active) {
    session.log[room].msg.push(msg);
  }
  else if (session.log[room] && !active) {
    session.log[room].msg.push(msg);
    session.log[room].unread++;
  }
  else { //if private
    session.log[room] = [];
    session.log[room].msg = [];
    session.log[room].msg.push(msg);
    session.log[room].unread = 0;
  }
}

//Draw log
function drawLog(room) {
  clear();
  session.log[room].msg.forEach(msg => {
    sl.log(msg);
  });
}

//Hash password
function hashLoginPassword(data) {
  sl.prompt('Enter password: ', true, res => {
    //Hash password before sending to server
    crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
      if (!err) {
        generateRSAKeyPair(data, derivedKey);
      }
      else {
        sl.log('Error: ' + err.message);
        login();
      }
    });
  });
}

//Hash register password
function hashRegisterPassword(name) {
  sl.prompt('Enter password: ', true, res => {
    //Hash password before sending to server
    let salt = crypto.randomBytes(128).toString('base64');
    crypto.pbkdf2(res, salt, 100000, 128, 'sha512', (err, derivedKey) => {
      if (!err) {
        socket.emit('register', {name, pw: derivedKey.toString('base64'), salt});
      }
      else {
        sl.log('Error: ' + err);
        register();
      }
    });
  });
}

//Hash room password
function hashRoomPassword(data) {
  sl.prompt('Enter password: ', true, res => {
    let salt = data.salt;
    crypto.pbkdf2(res, salt, 100000, 128, 'sha512', (err, derivedKey) => {
      if (!err) {
        socket.emit('joinPrivate', {room: data.room, user: session.user, private: true, pw: derivedKey.toString('base64'), token: session.token});
      }
      else {
        sl.log('Error: ' + err);
        session.home ? home() : room();
      }
    });
  });
}

//Generate RSA key pair
function generateRSAKeyPair(data, derivedKey) {
  crypto.generateKeyPair('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  }, (err, publicKey, privateKey) => {
    if (!err) {
      session.privateKey = privateKey;
      session.user.pubKey = publicKey;
      socket.emit('login', {name: data.name, pw: derivedKey.toString('base64'), pubKey: publicKey});
    }
    else {
      sl.log('Error: ' + err.message);
      login();
    }
  });
}

//Create room
function createRoom(res) {
  let room = res.slice(8);
  let regex = /^\w+$/;

  if (regex.test(room) && room.length >= 3) {
    sl.prompt('Do you want to make the room private (y/n): ', res => {
      if (res === 'n') {
        socket.emit('create', {room, user: session.user, private: false, token: session.token});
        home();
      }
      else if (res === 'y') {
        sl.prompt('Enter room password or leave empty: ', true, res => {
          if (res === '') {
            socket.emit('create', {room, user: session.user, private: true, pw: false, token: session.token});
            home();
          }
          else {
            //Hash password before sending to server
            let salt = crypto.randomBytes(128).toString('base64');
            crypto.pbkdf2(res, salt, 100000, 128, 'sha512', (err, derivedKey) => {
              if (!err) {
                socket.emit('create', {room, user: session.user, private: true, pw: derivedKey.toString('base64'), salt, token: session.token});
                home();
              }
              else {
                sl.log('Error: ' + err);
                home();
              }
            });
          } 
        });
      }
      else {
        sl.log('Command not recognized.');
        home();
      }
    });
    
  }
  else {
    sl.log('Room name can only contain letters, numbers and underscores and needs to be atleast 3 characters long.');
    home();
  }
}

//Change bash title
function setTitle(title)
{
  process.stdout.write(
    String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
  );
}

//Clear screen
function clear() {
  process.stdout.write('\x1b[2J');
}