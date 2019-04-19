const inquirer = require('inquirer');
const io = require('socket.io-client');

const socket = io.connect('http://localhost:4000', {reconnectionAttempts: 3});

socket.on('connect', () => {
  console.log('Connection made.');
  login();
}).on('connect_error', (err) => {
  console.log("Can't connect to server.");
});

//Login
function login() {
  inquirer.prompt({type: 'input', message: 'Enter username or !n to create new account:', name: 'input', prefix: '>'})
  .then(answer => {
    if (answer.input === '!n') {
      inquirer.prompt([
        {type: 'input', message: 'Enter username:', name: 'username', prefix: '>'},
        {type: 'password', message: 'Enter password:', name: 'password', mask: true, prefix: '>'}
      ])
      .then(answer => {
        socket.emit('message',{type: 'register', userData: {username: answer.username, password: answer.password}});
      });
    }
  });
};

