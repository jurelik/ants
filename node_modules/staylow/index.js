const readline = require('readline');

let buffer = []; //Buffer of pressed keys
let muted = false; //Is mute active?
let promptActive = false; //Is prompt active?
let upCounter = 0; //How many times has up/down been pressed

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
      //Redraw input on backspace
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(buffer[0]);
      for (let x = 1; x < buffer.length; x++) {
        if (muted === true) {
          process.stdout.write(globalOptions.globalMask);
        }
        else {
          process.stdout.write(buffer[x]);
        }
      }
    }
  }
  else if (key.name != 'backspace' && val != '\r' && key.name != 'up' && key.name != 'down') {
    buffer.push(val)
  }
  else if (key.name === 'up' && val != '\r') {
    if (upCounter + 1 <= rl.history.length) {
      upCounter++;
      let split = rl.history[upCounter - 1].split('');
      buffer.splice(1);
      buffer.push(...split);
    }
  }
  else if (key.name === 'down' && val != '\r') {
    if (upCounter - 1 > 0) {
      upCounter--;
      let split = rl.history[upCounter - 1].split('');
      buffer.splice(1);
      buffer.push(...split);
    }
  }
  else if (val === '\r' && !promptActive) { //Clear buffer on enter when prompt is not active
    buffer = [];
    upCounter = 0;
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
  if (promptActive) {
    process.stdout.write(buffer[0]);
    for (let x = 1; x < buffer.length; x++) {
      if (muted === true) {
        process.stdout.write(globalOptions.globalMask);
      }
      else {
        process.stdout.write(buffer[x]);
      }
    }
  }
  else {
    for (let x = 0; x < buffer.length; x++) {
      if (muted === true) {
        process.stdout.write(globalOptions.globalMask);
      }
      else {
        process.stdout.write(buffer[x]);
      }
    }
  }
  
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
    promptActive = true;
    rl.question(question, (res) => {
      rl.pause();
      //Redraw input on enter
      if (muted === true && globalOptions.logOnEnter === 'true') {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(buffer[0]);
        for (let x = 1; x < buffer.length; x++) {
          process.stdout.write(globalOptions.globalMask);
        }
        process.stdout.write('\n');
      }
      //Back into default state
      rl.history.shift();
      buffer = [];
      upCounter = 0;
      muted = false;
      promptActive = false;
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
      rl.history.splice(rl.history.indexOf(res), 1);
    }
  });
  rl.history.unshift(entry);
}

//Wrapper for rl.pause()
exports.pause = function() {
  rl.pause();
}

//Wrapper for rl.resume()
exports.resume = function() {
  rl.resume();
}

//Show current history
exports.showHistory = function() {
  console.log(rl.history);
}