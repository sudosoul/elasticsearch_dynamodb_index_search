// Load Dependencies:
const ES     = require('elasticsearch');
const prompt = require("prompt");
const colors = require("colors");

// Config colors
colors.setTheme({
  default: ['cyan', 'bold', 'bgBlack'],
  bad: ['red', 'bold', 'underline', 'bgWhite']
});


// Print initial message:
console.log('**********************************************************************************'.default);
console.log('This program will delete an entire index from the specified ElasticSearch host.'.default);
console.log('Press `CTRL C` at anytime to quit.'.default);
console.log('Please use with caution - deletes CANNOT BE UNDONE!'.bad);
console.log('Made with '.default +'<3'.bad +' by Rob <rob@viewlift.com>'.default);
console.log('**********************************************************************************\n'.default);

// Set global vars:// Begin prompting for values:
prompt.start();
prompt.get([
  {
    name: 'url',
    description: colors.cyan("Please enter the ElasticSearch URL"),
    type: 'string',
    required: true
  },
  {
    name: 'index',
    description: colors.cyan("Please enter the name of the index you want to delete"),
    type: 'string', 
    required: true
  }
], processInputs);

/**
 * Process the prompt input
 */
function processInputs(err, input) {
  if (err) {
    console.log('FATAL ERROR: '.bad, err);
    process.exit(1);
  } else {
    if (input.confirm === 'n' || input.confirm === 'no') process.exit(1);
    deleteIndex(input.url, input.index)
      .then(success => {
        console.log('Index successfully deleted!'.default);
    }).catch(e => {
      console.log('There was an error deleting the index - '.bad, e);
    });
  }
}

/**
 * Connect to ES & Delete the Index
 */
function deleteIndex(url, index) {
  const es = new ES.Client({
      host:          url, 
      log:          'debug',
      apiVersion:   '6.0',
      keepAlive:    false  // DO NOT CHANGE - LIBRARY CRASHSES WITHOUT THIS SET TO FALSE @see https://github.com/elastic/elasticsearch-js/issues/521 
  });
  return es.indices.delete({index:index});
} 



