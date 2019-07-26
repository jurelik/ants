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


//
//Function declarations
//

//Login
function login() {
  setTitle('ants');
  if (session.connected === false) {
    for (let x = 0; x < process.stdout.rows - 18; x++) {
      sl.log('');
    }
    session.log.home = {};
    session.log.home.msg = [];
    session.log.home.unread = 0;
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
  clear();
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
  sl.prompt('Enter username: ', res => {
    if (res.startsWith(':')) {
      if(res === ':n') {
        register();
      }
      else if (res === ':q' || res === ':Q') {
        sl.log('Shutting down.');
        process.exit();
      }
      else {
        login();
        sl.log(style.err('Command not recognized.'));
      }
    }
    else {
      socket.emit('getSalt', {name: res});
    }
  });
};

//Register
function register() {
  clear();
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
    else if (res === ':q' || res === ':Q') {
      sl.log('Shutting down.');
      process.exit();
    }
    else {
      login();
      sl.log(style.err('Username can only contain letters, numbers and underscores and needs to be between 3-15 characters long.'));
    }
  });
}

//Home
function home() {
  session.home = true;
  session.activeRoom = 'home';
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
        if (room != 'home' && !session.log[room].private) {
          sl.log(style.ls(`• ${room} (${session.log[room].unread} unread messages)`));
        }
      });
      home();
    }
    else if (res.startsWith(':log ')) {
      let user = res.slice(5);
      if (session.log[user] && session.log[user].private) {
        session.log[user].msg.forEach(msg => {
          sl.log(msg);
        });
        home();
      }
      else if (session.log[user] && !session.log[user].private) {
        sl.log('Log can only display private conversations.');
        home();
      }
      else {
        sl.log('Log not found.');
        home();
      }
    }
    else if (res === ':clear') {
      clear();
      drawLog('home');
      home();
    }
    else if (res.startsWith(':leave ')) {
      let _room = res.slice(7);
      socket.emit('leave', {room: _room, token: session.token});
    }
    else if (res === ':help' || res === ':h') {
      sl.log(`You can use the following commands while on the home screen:
• :ls - list all public rooms
• :join ${style.gray('[room]')} - join ${style.gray('[room]')}
• :create ${style.gray('[room]')} - create ${style.gray('[room]')}
• :c or :check - check joined rooms for unread messages
• :s ${style.gray('[room]')} or :switch ${style.gray('[room]')} - switch screen to ${style.gray('[room]')}
• :p ${style.gray('[user]')} ${style.gray('[message]')} - send a private ${style.gray('[message]')} to ${style.gray('[user]')}
• :leave ${style.gray('[room]')} - leave ${style.gray('[room]')}
• :clear - clear screen
• :changepw - change password
• :selfdestruct - delete account
• :q - exit ants`);
      home();
    }
    else if (res.startsWith(':mute ')) {
      let user = res.slice(6);
      socket.emit('mute', {user, token: session.token});
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
    else if (res === ':q' || res === ':Q') {
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
          if (room != 'home' && !session.log[room].private) {
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
        if (session.log[user] && session.log[user].private) {
          session.log[user].msg.forEach(msg => {
            sl.log(msg);
          });
          room();
        }
        else if (session.log[user] && !session.log[user].private) {
          sl.log('Log can only display private conversations.');
          room();
        }
        else {
          sl.log('Log not found.');
          room();
        }
      }
      else if (res === ':leave') {
        socket.emit('leave', {room: session.activeRoom, token: session.token});
      }
      else if (res === ':q' || res === ':Q') {
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
      else if (res.startsWith(':kick ')) {
        let user = res.slice(6);
        socket.emit('kick', {user, token: session.token});
        room();
      }
      else if (res.startsWith(':ban ')) {
        let user = res.slice(5);
        socket.emit('ban', {user, token: session.token});
        room();
      }
      else if (res.startsWith(':unban ')) {
        let user = res.slice(7);
        socket.emit('unban', {user, token: session.token});
        room();
      }
      else if (res.startsWith(':mute ')) {
        let user = res.slice(6);
        socket.emit('mute', {user, token: session.token});
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
    session.log[room] = {};
    session.log[room].private = true;
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