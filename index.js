const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const inquirer = require('inquirer');
const io = socketio.listen(4000);

let clients = [];

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
  clients.push(socket.id);
  console.log(clients);
  console.log(socket.rooms);
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

  socket.on('ls', () => {
    socket.emit('ls', listRooms(socket, clients));
  });

  socket.on('join', data => {
    socket.join(data.room, () => {
      console.log(Object.keys(socket.rooms));
      socket.emit('join', data.room)
    });
  });

  socket.on('disconnect', () => {
    clients.splice(clients.indexOf(socket.id), 1);
    // console.log(clients);
  });

  socket.on('message', data => {
    io.to(data.room).emit(data.message);
  });
});

function listRooms(socket, clients) {
  // console.log(socket.rooms); 
  let socketRooms = Object.keys(socket.rooms);
  // console.log('before: ' + socketRooms)

  socketRooms.splice(socketRooms.indexOf(socket.id), 1);

  // console.log('after: ' + socketRooms)

  return socketRooms;
}