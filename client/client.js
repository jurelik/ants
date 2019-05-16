const sl = require('staylow');
const io = require('socket.io-client');
const crypto = require('crypto');

const socket = io.connect('https://localhost:4000', {
  reconnectionAttempts: 3,
  //REMOVE THIS IN PRODUCTION!!!
  rejectUnauthorized: false
  //REMOVE THIS IN PRODUCTION!!!
});

sl.options({
  defaultPrompt: '',
  globalMask: '*',
  logOnEnter: 'false'
});

let session = {
  connected: false,
  log: {},
  activeRoom: ''
};

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
  if (data.type === 'success') {
    session.token = data.token;
    sl.log('Login successful');
    home();
  }
  else if (data.type === 'failed') {
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
          socket.emit('login', {name: data.name, pw: derivedKey.toString('base64')});
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

//On list
socket.on('ls', data => {
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

//On join
socket.on('join', data => {
  if (data.type === 'success') {
    sl.log(`Room successfully joined: ${data.room}`);
    session.activeRoom = data.room;
    room();
  }
  else if (data.type === 'notFound') {
    sl.log('Room not found');
    home();
  }
  else if (data.type === 'failed') {
    sl.log('Error: ' + data.err.message);
    home();
  }
  else {
    sl.log('Error: Unknown');
    home();
  }
});

//On create
socket.on('create', data => {
  if (data.type === 'success') {
    sl.log(`Room successfully created: ${data.room}`);
    home();
  }
  else if (data.type === 'roomExists') {
    sl.log(`Room already exists`);
    home();
  }
  else if (data.type === 'failed') {
    sl.log('Error: ' + data.err);
    home();
  }
  else {
    sl.log('Error: Unknown');
    home();
  }
})

//On message
socket.on('msg', data => {
  if (data.type === 'success') {
    sl.log(data.msg);
    addToLog(data.room, data.msg);
  }
  else if (data.type === 'public') {
    if (data.room === session.activeRoom) {
      sl.log(`${data.name}: ${data.msg}`);
      addToLog(data.room, `${data.name}: ${data.msg}`);
    }
    else {
      addToLog(data.room, `${data.name}: ${data.msg}`);
    }
  }
  else if (data.type === 'private') {
    sl.log(`PRIVATE from ${data.name}: ${data.msg}`);
    addToLog(data.room, data.msg);
  }
  else if (data.type === 'userNotFound') {
    sl.log(`User '${data.msgTo}' not found.`);
  }
  else if (data.type === 'userNotOnline') {
    sl.log(`User '${data.msgTo}' is not online.`);
  }
  else if (data.type === 'error') {
    sl.log('Error: ' + err);
  }
  else {
    sl.log('Error: Unknown');
  }
});

//On switch
socket.on('switch', data => {
  if (data.type === 'success') {
    if (data.roomOrUser === 'user' && !session.log[data.room]) {
      session.log[data.room] = [];
    }
    drawLog(data.room);
    session.activeRoom = data.room;
  }
  else if (data.type === 'failed') {
    sl.log('aw');
  }
});

//On invalid token
socket.on('tokenNotValid', data => {
  sl.log(data.err.message);
  login();
});

//Function declarations
function chat() {
  sl.prompt('').then(res => {
    socket.emit('message', {message: res} );
    chat();
  });
};

function login() {
  if (session.connected === false) {
    clear();
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
  sl.prompt('', false, res => {
    if (res === ':ls') {
      socket.emit('ls', {token: session.token});
    }
    else if (res.startsWith(':join ')) {
      let room = res.slice(6);
      socket.emit('join', {room, token: session.token});
    }
    else if (res.startsWith(':create ')) {
      let room = res.slice(8);
      socket.emit('create', {room, token: session.token});
    }
    else if (res.startsWith(':p ')) {
      let array = res.split(' ');
      let user = array[1];
      let msg = array.slice(2).join(' ');
      sl.addToHistory(`:p ${user} `);
      socket.emit('msg', {msg, type: 'private', token: session.token, msgTo: user});
      home();
    }
    else {
      sl.log('Command not found')
      home();
    }
  });
};

function room() {
  sl.prompt('', res => {
    if (res.startsWith(':p')) {
      let array = res.split(' ');
      let user = array[1];
      let msg = array.slice(2).join(' ');
      sl.addToHistory(`:p ${user} `);
      socket.emit('msg', {msg, type: 'private', token: session.token, msgTo: user});
      room();
    }
    else if (res.startsWith(':join ')) {
      let _room = res.slice(6);
      socket.emit('join', {room: _room, token: session.token});
    }
    else if (res.startsWith(':switch ')) {
      let array = res.split(' ');
      let _room = array[1];
      socket.emit('switch', {room: _room, token: session.token});
      room();
    }
    else {
      socket.emit('msg', {msg: res, type: 'public', token: session.token});
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

