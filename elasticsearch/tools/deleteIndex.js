// Load Dependencies:
const ES     = require('elasticsearch');
const prompt = require("prompt");
const colors = require("colors");

// Config prompt:
prompt.colors = false;
prompt.message = '';

// Print initial message:
console.log('**********************************************************************************');
console.log('This program will delete an entire index from the specified ElasticSearch host.');
console.log('Press `CTRL C` at anytime to quit.');
console.log('\nPlease use with caution - deletes CANNOT BE UNDONE!\n'.bold.underline.red);
console.log('Made with ' +'<3'.bold.bgRed.black +' by Rob Mullins <rob@viewlift.com>');
console.log('**********************************************************************************\n');

// Set global vars:
let url   = '';
let index = '';

// Begin prompting for values:
prompt.start();
prompt.get({
  properties: {
    url: {
      description: colors.cyan("Please enter the ElasticSearch URL")
    },
    index: {
      description: colors.cyan("Please enter the name of the index you want to delete")
    }
  }
}, processInputs});

function processInputs(err, input) {
  if (err) {
    console.log('FATAL ERROR: ', err);
    process.exit(1);
  } else {
    
  }
}



