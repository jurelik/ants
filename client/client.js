const sl = require('staylow');
const io = require('socket.io-client');
const crypto = require('crypto');

const socket = io.connect('http://localhost:4000', {reconnectionAttempts: 3});
sl.options({
  defaultPrompt: '',
  globalMask: '*',
  logOnEnter: 'false'
});
let session = {
  activeRooom: '',
  connected: false,
  log: {},
  user: {}
}
let jwtToken;
let privateKey;
let name;
let user = {};
let rooms = {};

//
//SOCKET EVENTS
//

//On connect
socket.on('connect', () => {
  sl.log('Connection made.');
  login();
}).on('connect_error', (err) => {
  sl.log("Can't connect to server.");
});

//On login
socket.on('login', data => {
  if (data.type === 'loginSuccessful') {
    session.token = data.token;
    session.user.name = data.name;
    session.user.id = socket.id;
    sl.log('Login successful');
    home();
  }
  else if (data.type === 'loginFailed') {
    sl.log('Username or password incorrect.');
    login();
  }
  else {
    sl.log('Error: ' + data.error)
  }
});

//On register
socket.on('register', data => {
  if (data.type === 'success') {
    sl.log('Account created');
    login();
  }
  else if (data.type === 'userExists') {
    sl.log('User already exists')
    register();
  }
  else if (data.type === 'failed') {
    sl.log('Error: ' + data.err);
    register();
  }
  else {
    sl.log('Error: Unknown');
    register();
  }
});

//On getSalt
socket.on('getSalt', data => {
  if (data.type === 'success') {
    sl.prompt('Enter password: ', true, res => {
      //Hash password before sending to server
      crypto.pbkdf2(res, data.salt, 100000, 128, 'sha512', (err, derivedKey) => {
        if (!err) {
          //Generate RSA key pair
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
              sl.log(err);
              login();
            }
          });
        }
        else {
          sl.log('Error: ' + err);
          login();
        }
      });
    });
  }
  else if (data.type === 'error') {
    sl.log('Error: ' + data.err);
    login();
  }
  else {
    sl.log('Error: Unknown');
  }
});

//On lsRooms
socket.on('lsRooms', data => {
  if (data.type === 'success') {
    sl.log(data.rooms);
    home();
  }
  else if (data.type === 'failed') {
    sl.log('Error' + data.err);
    home();
  }
  else {
    sl.log('Error: Unknown');
    home();
  }
});

//On lsUsers
socket.on('lsUsers', data => {
  if (data.type === 'success') {
    sl.log(data.userList);
  }
  else if (data.type === 'failed') {
    sl.log('Something went wrong');
  }
  else {
    sl.log('Error: Unknown');
  }
});

//On join
socket.on('join', data => {
  if (data.type === 'success') {
    sl.log(`Room successfully joined: ${data.room}`);
    session.activeRoom = data.room;
    session.log[data.room] = [];
    room();
  }
  else if (data.type === 'alreadyJoined') {
    sl.log('Room already joined, please use :switch to switch between rooms.');
    session.home ? home() : room();
  }
  else if (data.type === 'failed') {
    sl.log('Error: ' + data.err);
    session.home ? home() : room();
  }
  else if (data.type === 'notFound') {
    sl.log('Room not found');
    session.home ? home() : room();
  }
  else if (data.type === 'error') {
    sl.log('Error: ' + data.err.message);
    if (session.home) {
      home();
    }
    else {
      room();
    }
  }
  else {
    sl.log('Error: Unknown');
    session.home ? home() : room();
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
  else if (data.type === 'failed') {
    sl.log('Error: ' + data.err);
  }
  else {
    sl.log('Error: Unknown');
  }
})

//On switch
socket.on('switch', data => {
  if (data.type === 'success') {
    drawLog(data.room);
    session.activeRoom = data.room;
  }
  else if (data.type === 'failed') {
    sl.log('Please join a room first before using :switch');
  }
  else if (data.type === 'error') {
    sl.log('Error: ' + data.err);
  }
  else {
    sl.log('Error: Unknown');
  }
});

//On msgInit
socket.on('msgInit', data => {
  if (data.type === 'success' && data.visible === 'public') {
    data.userList.forEach(user => {
      const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(session.msg));
      socket.emit('msg', {msg, dest: user.id, visible: 'public', token: session.token});
    });
    session.msg = ''; //Delete message from memory after it is sent
    session.to = ''; //Delete 'to' value from memory after message is sent
  }
  else if (data.type === 'success' && data.visible === 'private') {
    const self = {
      id: session.user.id,
      pubKey: session.user.pubKey
    };
    data.userList.push(self);
    data.userList.forEach(user => {
      const msg = crypto.publicEncrypt(user.pubKey, Buffer.from(session.msg));
      socket.emit('msg', {msg, dest: user.id, visible: 'private', to: session.to, token: session.token});
    });
    session.msg = ''; //Delete message from memory after it is sent
    session.to = ''; //Delete 'to' value from memory after message is sent
  }
  else {
    sl.log('Something went wrong');
  }
});

//On message
socket.on('msg', data => {
  if (data.type === 'success' && data.visible === 'public') {
    if(session.activeRoom === data.room) {
      const msg = crypto.privateDecrypt(session.privateKey, data.msg);
      sl.log(`${data.from}: ${msg.toString()}`);
      addToLog(data.room, `${data.from}: ${msg.toString()}`);
    }
    else {
      const msg = crypto.privateDecrypt(session.privateKey, data.msg);
      addToLog(data.room, `${data.from}: ${msg.toString()}`);
    }
  }
  else if (data.type === 'success' && data.visible === 'private') {
    const msg = crypto.privateDecrypt(session.privateKey, data.msg);
    if (!data.self) {
      sl.log(`PRIVATE from ${data.from}: ${msg.toString()}`);
      addToLog(data.from, `PRIVATE from ${data.from}: ${msg.toString()}`);
    }
    else {
      sl.log(`PRIVATE to ${data.to}: ${msg.toString()}`);
      addToLog(data.to, `PRIVATE to ${data.to}: ${msg.toString()}`);
    }
  }
  else if (data.type === 'failed') {
    sl.log('Error: ' + err.message);
  }
  else {
    sl.log('Error: Unknown');
  }
});

//On tokenNotValid
socket.on('tokenNotValid', () => {
  sl.log('Token is not valid, please log in again.');
  login();
});

//Function declarations

function login() {
  if (session.connected === false) {
    clear();
    sl.log(``);
    sl.log(`
  

  
             ,
    _,-'\\   /|   .    .    /\`.
_,-'     \\_/_|_  |\\   |\`. /   \`._,--===--.__
^       _/"/  " \\ : \\__|_ /.   ,'    :.  :. .\`-._
      // ^   /7 t'""    "\`-._/ ,'\\   :   :  :  .\`.
      Y      L/ )\         ]],'   \\  :   :  :   : \`.
      |        /  \`.n_n_n,','\\_    \\ ;   ;  ;   ;  _>
      |__    ,'     |  \\\`-'    \`-.__\\_______.==---'
     //  \`""\\\\      |   \\            \\
     \\|     |/      /    \\            \\
                   /     |             \`.
                  /      |               ^
                 ^       |                         アリ
                 
                 `)
    sl.log('Welcome to ants. To create a new account please enter /n');
    session.connected = true;
  }
  sl.prompt('Enter username: ', res => {
    if (res.startsWith(':')) {
      if(res.slice(1) === 'n') {
        register();
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

function register() {
  sl.log('REGISTER');
  sl.prompt('Enter username: ', res => {
    let username = res;
    sl.prompt('Enter password: ', true, res => {
      //Hash password before sending to server
      let salt = crypto.randomBytes(128).toString('base64');
      crypto.pbkdf2(res, salt, 100000, 128, 'sha512', (err, derivedKey) => {
        if (!err) {
          socket.emit('register', {name: username, pw: derivedKey.toString('base64'), salt});
        }
        else {
          sl.log('Error: ' + err);
          register();
        }
      });
    })
  });
}

function home() {
  session.home = true;
  sl.prompt('', false, res => {
    if (res === ':ls') {
      socket.emit('lsRooms', {token: session.token});
    }
    else if (res.startsWith(':join ')) {
      let room = res.slice(6);
      socket.emit('join', {room, user: session.user, token: session.token});
    }
    else if (res.startsWith(':create ')) {
      let room = res.slice(8);
      socket.emit('create', {room, user: session.user, token: session.token});
      home();
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
    else {
      sl.log('Command not found')
      home();
    }
  });
};

function room() {
  session.home = false;
  sl.prompt('', res => {
    if (res.startsWith(':')) {
      if (res.startsWith(':join ')) {
        let room = res.slice(6);
        socket.emit('join', {room, user: session.user, token: session.token});
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
      else if (res.startsWith(':switch ')) {
        let _room = res.slice(8);
        socket.emit('switch', {room: _room, token: session.token});
        room();
      }
      else if (res.startsWith(':log ')) {
        let user = res.slice(5);
        if (session.log[user]) {
          session.log[user].forEach(msg => {
            sl.log(msg);
          });
          room();
        }
        else {
          sl.log('Log not found');
          room();
        }
      }
      else if (res === ':ls') {
        socket.emit('lsUsers', {token: session.token});
        room();
      }
      else {
        sl.log('Command not found');
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

function addToLog(room, msg) {
  if (session.log[room]) {
    session.log[room].push(msg);
  }
  else {
    session.log[room] = [];
    session.log[room].push(msg);
  }
}

function drawLog(room) {
  clear();
  session.log[room].forEach(msg => {
    sl.log(msg);
  });
}

function clear() {
  process.stdout.write('\x1b[2J');
}