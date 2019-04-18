const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const readlineSync = require('readline-sync');
const io = socketio.listen(4000);

//Connect to MongoDB
function serverInit() {

  let username = readlineSync.question('Enter username: ');
  let password = readlineSync.question('Enter password: ', {hideEchoBack: true});
  
  mongoose.connect(`mongodb+srv://${username}:${password}@jl-cluster-test-24u6z.mongodb.net/ants?retryWrites=true`, {useNewUrlParser: true}, (err) => {
    if (err) {
      serverInit();
    }
  });
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