const readline = require('readline');

let buffer = []; //Buffer of pressed keys
let muted = false; //Is mute active?

let globalOptions = {
  defaultPrompt: '> ', //Default prompt
  globalMask: '*', //Mask for muted inputs
  logOnEnter: 'true' //Behavior on 'enter' keypress
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  removeHistoryDuplicates: true
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
          process.stdout.write(globalOptions.globalMask);
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
  if (muted === true && !/\r|\n/.test(stringToWrite)) {
    rl.output.write(globalOptions.globalMask);
  }
  else if (muted === true && /\r|\n/.test(stringToWrite)) {
    //do nothing
  }
  //This overwrites the default behaviour of loggin when pressing enter
  else if (/\r|\n/.test(stringToWrite) && globalOptions.logOnEnter === 'false') {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }
  //
  else{
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
      question = globalOptions.defaultPrompt;
    }
    buffer.unshift(question);
    rl.resume();
    rl.question(question, (res) => {
      rl.pause();
      //Redraw input on enter
      if (muted === true && globalOptions.logOnEnter === 'true') {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(buffer[0]);
        for (x = 1; x < buffer.length; x++) {
          process.stdout.write(globalOptions.globalMask);
        }
        process.stdout.write('\n');
      }
      //Back into default state
      rl.history.shift();
      buffer = [];
      muted = false;
      callback(res);
    });
  }
  catch(err) {
    console.log(err);
  }
};

//Helper function for changing the options
/**
 * @param {Object} options - Options object
 * @param {String} [options.defaultPrompt] - Change the default prompt
 * @param {String} [options.globalMask] - Change the mask for muted prompts
 * @param {String} [options.logOnEnter] - Change behavior on 'enter' keypress
 */
exports.options = function(options) {
  //defaultPrompt
  if (options.defaultPrompt === '') {
    globalOptions.defaultPrompt = options.defaultPrompt;
  }
  else {
    globalOptions.defaultPrompt = options.defaultPrompt || globalOptions.defaultPrompt;
  }

  //globalMask
  if (options.globalMask === '') {
    globalOptions.globalMask = options.globalMask;
  }
  else {
    globalOptions.globalMask = options.globalMask || globalOptions.globalMask;
  }
  
  //logOnEnter
  if (options.logOnEnter === 'false') {
    globalOptions.logOnEnter = options.logOnEnter;
  }
  else {
    globalOptions.logOnEnter = 'true';
  } 
}

//Helper function for saving an entry to history
/**
 * @param {String} entry
 */
exports.addToHistory = function(entry) {
  rl.history.forEach(res => {
    if (res === entry) {
      rl.history.splice(rl.history.indexOf(res));
    }
  });
  rl.history.unshift(entry);
}