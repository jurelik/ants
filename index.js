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
  socket.on('message', data => {
    if (data.type === 'register') {
      let user = new User({
        username: data.userData.username,
        password: data.userData.password
      });
      user.save();
    }
  });
});