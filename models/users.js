const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create new Schema & Model
const UserSchema = new Schema({
  username: String,
  password: String
});

const User = mongoose.model('user', UserSchema);

module.exports = User;