const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/users');
const io = socketio.listen(4000);

//Connect to MongoDB
mongoose.connect('mongodb+srv://<user>:<password>@jl-cluster-test-24u6z.mongodb.net/ants?retryWrites=true', {useNewUrlParser: true});

mongoose.connection.once('open', () => {
  console.log('connection to MongoDB has been made');
}).on('error', err => {
  console.log('Error connecting to MongoDB: ' + err);
});

io.on('connection', socket => {
  socket.on('send', data => {
    if (data.type === 'register') {
      let user = new User({
        username: data.userData.username,
        password: data.userData.password
      });
      user.save();
    }
  });
});