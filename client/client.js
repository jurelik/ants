const sl = require('staylow');
const io = require('socket.io-client');

const socket = io.connect('http://localhost:4000', {reconnectionAttempts: 3});
sl.defaultPrompt('');
let connected = false;
let jwtToken;
let name;

//
//SOCKET EVENTS
//

//On connect
socket.on('connect', () => {
  socketID = socket.id;
  sl.log('Connection made.');
  login();
}).on('connect_error', (err) => {
  sl.log("Can't connect to server.");
});

//On login
socket.on('login', data => {
  if (data.type === 'loginSuccessful') {
    jwtToken = data.token;
    name = data.name;
    sl.log('Login successful');
    sl.log(jwtToken);
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

//On list
socket.on('ls', data => {
  sl.log(data.rooms);
  home(data.username);
});

//On join
socket.on('join', data => {
  sl.log(`Room successfully joined: ${data.room}`);
  room(data.room, data.username);
});

//On message
socket.on('message', data => {
  sl.log(`${data.username}: ${data.message}`);
});

//Function declarations
function chat() {
  sl.prompt('').then(res => {
    socket.emit('message', {message: res} );
    chat();
  });
};

function login() {
  if (connected === false) {
    clear();
    sl.log(``);
    sl.log(`
  アリ

  
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
                 ^       |
                 
                 `)
    sl.log('Welcome to ants. To create a new account please enter /n');
    connected = true;
  }
  sl.prompt('Enter username: ', res => {
    if (res.startsWith('/')) {
      if(res.slice(1) === 'n') {
        register();
      }
      else {
        sl.log('Command not recognized.');
        login();
      }
    }
    else {
      let username = res;
      sl.prompt('Enter password: ', true, res => {
        socket.emit('login', {name: username, pw: res});
      });
    }
  });
};

function register() {
  sl.log('REGISTER');
  sl.prompt('Enter username: ', res => {
    let username = res;
    sl.prompt('Enter password: ', true, res => {
      socket.emit('register', {name: username, pw: res});
    })
  });
}

function home() {
  sl.prompt('', false, res => {
    if (res === 'ls') {
      socket.emit('ls', {name, token: jwtToken});
    }
    else if (res.startsWith('/join ')) {
      let room = res.slice(6);
      socket.emit('join', {room: room, name});
    }
    else {
      sl.log('Command not found')
      home();
    }
  });
};

function room(roomName) {
  sl.prompt('', res => {
    if (res.startsWith('/')) {

    }
    else {
      socket.emit('message', {message: res, room: roomName, name});
      room(roomName);
    }
  })
};

function clear() {
  process.stdout.write('\x1b[2J');
}