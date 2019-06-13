const chalk = require('chalk');

const user = chalk.bold.red;
const prompt = chalk.bold;
const joined = chalk.bold.gray;
const left = chalk.bold.gray;
const ls = chalk.cyan;
const err = chalk.bold.red;
const welcome = chalk.bold;

module.exports = {
  user,
  prompt,
  joined,
  left,
  ls,
  err,
  welcome
};