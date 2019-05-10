# staylow
A Node.JS module with custom prompt and log functions, mainly intended for CLI chat applications. User input won't be interrupted by asynchronous messages received and logged in the terminal.

## Init
```
const sl = require('staylow');
sl.options({
  defaultPrompt: String // (defaults to '> ')
  globalMask: String // set the mask used for muted input (defaults to '*')
  logOnEnter: String // 'true' or 'false', change default behavior on 'enter' keypress (defaults to 'true')
});
```

## Prompt
Normal prompt:
```
sl.prompt('Say hi: ', res => {
  //user input will be visible
});

sl.prompt('', res => {
  //in this case the prompt will default to options.defaultPrompt
});
```
Masked prompt:
```
sl.prompt('Say hi: ', true, res => {
  //user input will be masked with options.globalMask
});
```
Saving history:
```
//By default, user entries won't be saved to the entry history
//To save manually, use the following:
sl.addToHistory('String you want to save');
```
## Log
Always use the staylow log method instead of console.log to output to terminal. This insures that any active user prompts won't be interrupted.
```
sl.log('Hello world');
```
