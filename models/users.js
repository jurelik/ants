const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create new Schema & Model
const UserSchema = new Schema({
  name: String,
  pw: String,
  id: String,
  salt: String,
});

const User = mongoose.model('user', UserSchema);

module.exports = User;