const sl = require('staylow');
const io = require('socket.io-client');

const socket = io.connect('http://localhost:4000', {reconnectionAttempts: 3});
sl.defaultPrompt('');
let socketID;
let connected = false;

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
    sl.log('Login successful');
    home(data.username);
  }
  else if (data.type === 'loginFailed') {
    sl.log('Login failed');
    login();
  }
  else {
    sl.log('Error: ' + data.error)
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
        sl.log('ayyy');
      }
      else {
        sl.log('Command not recognized.');
        login();
      }
    }
    else {
      let username = res;
      sl.prompt('Enter password: ', true, res => {
        socket.emit('login', {username: username, password: res});
      });
    }
  });
};

function home(username) {
  sl.prompt('', false, res => {
    if (res === 'ls') {
      socket.emit('ls', {username: username});
    }
    else if (res.startsWith('/join ')) {
      let room = res.slice(6);
      socket.emit('join', {room: room, username: username});
    }
    else {
      sl.log('Command not found')
      home(username);
    }
  });
};

function room(roomName, username) {
  sl.prompt('', res => {
    if (res.startsWith('/')) {

    }
    else {
      socket.emit('message', {message: res, room: roomName, username: username});
      room(roomName, username);
    }
  })
};

function clear() {
  process.stdout.write('\x1b[2J');
}