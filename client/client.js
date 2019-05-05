const sl = require('staylow');
const io = require('socket.io-client');
const crypto = require('crypto');

const socket = io.connect('http://localhost:4000', {reconnectionAttempts: 3});
sl.defaultPrompt('');
let connected = false;
let jwtToken;
let privateKey;
let name;
let user = {};

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
    user.token = data.token;
    user.name = data.name;
    user.id = socket.id;
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
            modulusLength: 2048
          }, (err, publicKey, privateKey) => {
            if (!err) {
              privateKey = privateKey;
              socket.emit('login', {name: data.name, pw: derivedKey.toString('base64'), pubKey: publicKey})
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
    room(data.room);
  }
  else if (data.type === 'failed') {
    sl.log('Error: ' + data.err);
    home();
  }
  else {
    sl.log('Error: Unknown');
    home();
  }
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
      socket.emit('getSalt', {name: username});
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
    if (res === 'ls') {
      socket.emit('ls', {user});
    }
    else if (res.startsWith('/join ')) {
      let room = res.slice(6);
      socket.emit('join', {room, user});
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