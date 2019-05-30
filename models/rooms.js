const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create new Schema & Model
const roomSchema = new Schema({
  name: String,
  private: Boolean,
  pw: String,
  owner: String,
  ban: Array,
  salt: String,
  users: Array,
  welcome: String
});

const Room = mongoose.model('room', roomSchema);

module.exports = Room;
