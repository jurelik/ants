const readline = require('readline');
const socketio = require('socket.io-client');

const socket = socketio.connect('http://localhost:4000');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter username or :n to create new account', input => {
  if (input === ':n') {
    rl.question('Enter desired username:', username => {
      rl.question('Enter desired password:', password => {
        socket.emit('message',{type: 'register', userData: {username: username, password: password}});
        // console.log(username + password);
      });
    });
  }
});