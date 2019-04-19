const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const inquirer = require('inquirer');
const io = socketio.listen(4000);

//Connect to MongoDB
function serverInit() {

  inquirer.prompt([
    {type: 'input', message: 'Enter username:', name: 'username', prefix: '>'},
    {type: 'password', message: 'Enter password:', name: 'password', prefix: '>', mask: true}
  ])
  .then(answer => {
    mongoose.connect(`mongodb+srv://${answer.username}:${answer.password}@jl-cluster-test-24u6z.mongodb.net/ants?retryWrites=true`, {useNewUrlParser: true}, (err) => {
      if (err) {
        serverInit();
      }
    });
  })
};

serverInit(); //Initialize connection

mongoose.connection.once('open', () => {
  console.log('connection to MongoDB has been made.');
})
.on('error', err => { //Error handler
  if(err.message === 'Authentication failed.') {
    console.log('Username or password incorrect.');
    serverInit();
  }
  else {
    console.log('MongoDB Error: ' + err.message);
  }
});

//Socket.IO
io.on('connection', socket => {
  //Initial registration / login
  socket.on('init', data => {
    if (data.type === 'register') {
      User.findOne({username: data.userData.username}, (err, user) => {
        if (!err && !user) {
          let newUser = new User({
            username: data.userData.username,
            password: data.userData.password
          });
          newUser.save();
          socket.emit('register', {type: 'success'});
        }
        else if (!err && user) {
          socket.emit('register', {type: 'userExists'});
        }
        else {
          socket.emit('register', {type: 'error'});
        }
      })
      
    }
    else if(data.type === 'login') {
      User.findOne({username: data.userData.username}, (err, user) => {
        if(!err && user) {
          if (data.userData.password === user.password) {
            socket.emit('login', {type: 'loginSuccessful'});
          }
          else {
            socket.emit('login', {type: 'loginFailed'});
          }
        }
        else if (!err & !user) {
          socket.emit('login', {type: 'loginFailed'});
        }
        else {
          socket.emit('login', {type: 'error'});
        }
      });
    }
  });
});