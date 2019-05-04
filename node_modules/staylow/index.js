const readline = require('readline');

let buffer = []; //Buffer of pressed keys
let muted = false; //Is mute active?
let defaultPrompt = '> '; //Default prompt
let globalMask = '*'; 

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//Keep track of pressed keys
process.stdin.on('keypress', (val, key) => {
  if(key.name === 'backspace' && val != '\r') {
    if (buffer.length > 1) {
      buffer.pop();
      if (muted === true) { //Redraw input on backspace
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(buffer[0]);
        for (x = 1; x < buffer.length; x++) {
          process.stdout.write(globalMask);
        }
      }
    }
  }
  else if (key.name != 'backspace' && val != '\r') {
    buffer.push(val)
  }
});

//Change the readline logging function
rl._writeToOutput = function _writeToOutput(stringToWrite) {
  if (muted === true) {
    rl.output.write(globalMask);
  }
  else {
    rl.output.write(stringToWrite);
  }
};

//Custom log function
/**
 * @param {string} text
 */
exports.log = function(text) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(text);
};

//Custom prompt function
/**
 * @param {string} question
 * @param {boolean} mute
 * @param {function} callback
 */
exports.prompt = function(question, mute, callback) {
  try {
    //Check for different function parameter positioning
    if(arguments.length === 2 && typeof arguments[1] === 'function') {
      callback = arguments[1];
      mute = false;
    }
    else if (typeof arguments[1] != 'boolean' || typeof arguments[2] != 'function') {
      throw new Error('Prompt function parameters are not set correctly.');
    }
    //Change the readline question function
    rl.question = function(query, cb) {
      if (typeof cb === 'function') {
        if (rl._questionCallback) {
          rl.prompt();
        } else {
          rl._oldPrompt = rl._prompt;
          rl.setPrompt(query);
          rl._questionCallback = cb;
          rl.prompt();
          //Inject this bit
          if (mute) {
            muted = true;
          }
          else {
            muted = false;
          }
          //
        }
      }
    };
    if (question === '') {
      question = defaultPrompt;
    }
    buffer.unshift(question);
    rl.question(question, (res) => {
      //Redraw input on enter
      if (muted === true) {
        rl.history.shift();
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(buffer[0]);
        for (x = 1; x < buffer.length; x++) {
          process.stdout.write(globalMask);
        }
        process.stdout.write('\n');
      }
      //Back into default state
      buffer = [];
      muted = false;
      callback(res);
    });
  }
  catch(err) {
    console.log(err);
  }
};

//Helper function for changing the value of defaultPrompt
/**
 * @param {string} prompt
 */
exports.defaultPrompt = function(prompt) {
  defaultPrompt = prompt;
};

//Helper function for changing the value of mask
/**
 * @param {String} mask
 */
exports.setMask = function(mask) {
  globalMask = mask;
}

