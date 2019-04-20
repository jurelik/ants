const inquirer = require('inquirer');
const io = require('socket.io-client');

const socket = io.connect('http://localhost:4000', {reconnectionAttempts: 3});
let socketID;

socket.on('connect', () => {
  socketID = socket.id;
  console.log('Connection made.');
  login();
}).on('connect_error', (err) => {
  console.log("Can't connect to server.");
});

socket.on('login', data => {
  if (data.type === 'loginSuccessful') {
    console.log('Login successful');
    home();
  }
  else if (data.type === 'loginFailed') {
    console.log('Username or password incorrect. Please try again.');
    login();
  }
});

socket.on('register', data => {
  if (data.type === 'success') {
    console.log('Registration successful.');
    login();
  }
  else if (data.type === 'userExists') {
    console.log('Username already exists.');
    login();
  }
  else {
    console.error('Error occured when registering, please try again.');
    login();
  }
});

socket.on('ls', data => {
  console.log(data);
  home();
});

socket.on('join', data => {
  console.log(`Joined room '${data.room}'`);
  room(data.room);
});

socket.on('message', data => {
  console.log(data.message);
});

//Login
function login() {
  inquirer.prompt({type: 'input', message: '!l to login or !n to create new account:', name: 'input', prefix: '>'})
  .then(answer => {
    if (answer.input === '!n') {
      inquirer.prompt([
        {type: 'input', message: 'Enter username:', name: 'username', prefix: '>'},
        {type: 'password', message: 'Enter password:', name: 'password', mask: true, prefix: '>'}
      ])
      .then(answer => {
        socket.emit('init',{type: 'register', userData: {username: answer.username, password: answer.password}});
      });
    }
    else if (answer.input === '!l'){
      inquirer.prompt([
        {type: 'input', message: 'Enter username:', name: 'username', prefix: '>'},
        {type: 'password', message: 'Enter password:', name: 'password', mask: true, prefix: '>'}
      ])
      .then(answer => {
        socket.emit('init', {type: 'login', userData: {username: answer.username, password: answer.password}});
      })
    }
    else {
      console.log('Command not recognized.');
      login();
    }
  });
};

//Home
function home() {
  inquirer.prompt({type: 'input', name: 'option', prefix: '>'})
  .then(answer => {
    if (answer.option === 'ls') {
      socket.emit('ls');
    }
    else if(answer.option.startsWith('/join ')) {
      let room = answer.option.slice(6);
      socket.emit('join', {room: room});
    }
  });
}

function room(room) {
  inquirer.prompt({type: 'input', name: 'message', prefix: '>'})
  .then(res => {
    socket.emit('message', {message: res.message, room: room});
  });
}
