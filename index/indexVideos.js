/**
 * Lambda Function to Index Video Data
 *
 * This service is attached as a trigger to the following DynamoDB table: PROD.CONTENT.CONTENT_METADATA.
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION  - The AWS Region, available by default by Lambda.
 *  STAGE       - The development stage (dev, staging, prod).
 *  ES_ENDPOINT - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION  - The version of ElasticSearch used on our cluster.
 *  ES_SUGGEST_SKIP - Comma separated string including the words to skip (a,the,of,in).
 *  
 *
 * @requires api.js
 * @requires index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const API  = require('./shared/ViewLift/api.js');         // Custom VL API Module
const ESI  = require('./shared/ElasticSearch/index.js');  // Custom ES Index Module

/**
 * Lambda Entry Point
 * Performs indexing on a single or multiple DynamoDB event(s).
 *
 * @param {object} event            - The DynamoDB/Caller Event data. Contains the DynamoDB record data.
 * @param {object} context          - Object containing runtime information for this Lambda function.
 * @param {LambdaCallback} callback - The callback that handles the Lambda completion.
 *
 * @callback LambdaCallback
 * @param {Error}         error   - Optional error object to indicate Lambda failure. 
 * @param {object|string} success - Optional JSON.stringify compatible object or string to indicate Lambda success.
 */
exports.handler = function(event, context, callback) {
  /*********************************************************************************************
  *                                    MAIN
  *********************************************************************************************/

  // Instantiate VL API & ES Index Classes..
  const api = new API(process.env.STAGE, 'server');                     // Custom ViewLift API Class
  const esi = new ESI(process.env.ES_ENDPOINT, process.env.ES_VERSION); // Custom ElasticSearch Indexing Class

  //** Iterate through DynamoDB Events **//
  const processing = []; 
  event.Records.forEach(record => {
    console.log(record);
    //** Perform Async Indexing & Push Promise to Array **// 
    const type = record.dynamodb.NewImage ? record.dynamodb.NewImage.objectKey.S : record.dynamodb.OldImage.objectKey.S; // NewImage only exists on Insert/Modify events, OldImage must be used on Remove
    if (type === 'video') { // Only handle events with supported content type
      console.log('******************************');
      console.log(record.dynamodb);
      console.log('******************************');
      processing.push(handleEvent(record)); 
    }
  });

  //** Wait for all events to be processed, Regardless of success **//
  Promise.all(processing.map(p => p.catch(e => e)))
    .then(processed => {
      console.log('All video records processed!');
      // Track Successful & Failed Events..
      let succeeded = 0;
      let failed    = 0;
      let total     = processed.length;
      processed.forEach(process => {
        if (process instanceof Error) {
          console.log('Error processing an event: ', process); // Print the Error rejection
          failed++;
        } else {
          succeeded++;
        }
      });
      // All events processed, end lambda execution..
      console.log('Successfully processed %d/%d events.', succeeded, total);
      console.log('Failed processing %d/%d events.', failed, total);
      if (failed > 0) {
        // Exit Lambda with FAILED status:
        return callback('There was an error processing ' +failed +' events!');
      } else {
        // Exit Lambda with SUCCESS status:
        return callback(null, 'Successfully processed all ' +total +' events!');
      }
  });

  /*********************************************************************************************
  *                                   FUNCTIONS 
  *********************************************************************************************/

  /**
   * Determines the event type and handles it appropriately.
   *
   * @param  {object} record  - The DynamoDB Event Record.
   * @return {Promise.<boolean,Error>} Promise fulfilled with true, rejects with Error.
   */
  function handleEvent(record) {
    switch (record.eventName) {
      case 'INSERT':
        return _handleInsert(record);
      case 'MODIFY':
        return _handleModify(record);
      case 'REMOVE':
        return _handleRemove(record);
    }
  }

  /**
   * Handles INSERT Events.
   *
   * @param    {object} record - The DynamoDB Event Record.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean}         True on succesful insert.
   * @rejects  {Error}           An ES error.
   */
  function _handleInsert(record) {
    return new Promise((fulfill, reject) => {
      prepareVideoDocument(record)
        .then(doc => {
          esi.insertDocument(record.dynamodb.Keys.site.S, 'videos', record.dynamodb.Keys.id.S, doc)
            .then(success => {
              fulfill(true);
          }).catch(e => {
            reject(e);
          });
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * Handles MODIFY Events.
   *
   * @param    {object} record - The DynamoDB Event Record.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean}         True on succesful modify.
   * @rejects  {Error}           An ES error.
   */
  function _handleModify(record) {
    return new Promise((fulfill, reject) => {
      prepareVideoDocument(record)
        .then(doc => {
          esi.insertDocument(record.dynamodb.Keys.site.S, 'videos', record.dynamodb.Keys.id.S, doc)
            .then(success => {
              fulfill(true);
          }).catch(e => {
            reject(e);
          });
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * Handles REMOVE Events.
   *
   * @param    {object} record - The DynamoDB Event Record.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean}         True on succesful remove.
   * @rejects  {Error}           An ES error.
   */
  function _handleRemove(record) {
    return new Promise((fulfill, reject) => {
      esi.removeDocument(record.dynamodb.Keys.site.S, 'videos', record.dynamodb.Keys.id.S)
        .then(success => {
          fulfill(true);
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * @todo define categories & tags in doc body
   * Prepare a video document object with data retrieve from VL API.
   * 
   * @param    {object} record - The DynamoDB Event Record.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}          The document body object.
   * @rejects  {Error}           A VL API Error.
   */   
  function prepareVideoDocument(record) {
    return new Promise((fulfill, reject) => {
      // Get Complete Video Data from API:
      api.getVideo(record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S)
        .then(video => {
          console.log('printing video');
          console.log(video);
          // Define & Build Document Body:
          const doc = {
            title:           video.gist.title,
            suggestTitle:    defineTitleSuggestions(video.gist.title),
            type:            'video',
            description:     video.gist.description,
            primaryCategory: video.gist.primaryCategory ? video.gist.primaryCategory.title : null,
            categories:      defineCategories(video.categories),
            tags:            defineTags(video.tags),
            status:          video.contentDetails.status,
            people:          video.creditBlocks ? definePeople(video.creditBlocks) : null,
            isTrailer:       video.gist.isTrailer || false,
            free:            video.gist.free,
            year:            video.gist.year,
            parentalRating:  video.parentalRating,
            data:            video
          };
          // Fulfill with video document:
          fulfill(doc);
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * Defines an array of suggestions for a video title.
   *
   * Example:
   *  If the title is "Welcome to the Black Parade", we will generate
   *  the following combinations/suggestions...
   *    "Welcome to the Black Parade"
   *    "Black Parade"
   *    "Parade"
   *
   * Note:
   *  We skip common words, and these common words will also be excluded
   *  when the search is performed on the client-side EXCEPT if the
   *  common word is the first word in the search phrase. 
   *  Example: If user searches for 'the' - we will only return titles that begin with 'the'.
   *
   * Explanation...
   *  We define multiple phrases for suggestions to cover all search cases
   *    Input: "Welcome"   // Request: "welcome" // Response: "Welcome to the Black Parade"
   *    Input: "the black" // Request: "black"   // Response: "Welcome to the Black Parade"
   *    Input: "parade"    // Request: "parade"  // Response: "Welcome to the Black Parade"
   *
   * @param  {string} title - The full movie title.
   * @return {array} Array holding the combination of suggestion phrases.
   */
  function defineTitleSuggestions(title) {
    const suggestions = [];                               // Array to hold all suggestions
    const skip  =  process.env.ES_SUGGEST_SKIP.split(',') // The skip words 
    const words = title.split(' ');   // Split/explode title into array of each word in title ['The', 'Movie', 'Title']
    // Iterate through each word, starting with 2nd word...
    for (let x=1; x<words.length; x++) {
      let word = words[x];
      // If the word not found in skip word array list...
      if (skip.indexOf(word) === -1) {
        // Iterate through the rest of the words to construct the phrase...
        let phrase = word;
        for (let y=x+1; y<words.length; y++) {
          phrase = phrase +' ' +words[y]; 
        }
        suggestions.push(phrase); // Push full phrase to array
      }
    }
    suggestions.push(title);  // Push the full/original title
    return suggestions;
  }

  /**
   * Parses the `creditBlocks` field returned from API and
   * prepares an array of objects containing the name of each
   * actor and directors found in the `creditBlocks`.
   *
   * @param  {array} creditBlocks - The creditBlocks array returned from API.
   * @return {array} Array of objects containing name of each actor/director.
   */
  function definePeople(creditBlocks) {
    const people = [];
    creditBlocks.forEach(block => {
      block.credits.forEach(credit => {
        people.push({name: credit.title});
      });
    });
    return people;
  }

  /**
   * Parses the `categories` field returned from API and
   * prepares an array of objects containing the name of each category.
   *
   * @param  {array} categories - The categories array returned from API.
   * @return {array} Array of objects containing name of each category.
   */
  function defineCategories(categories) {
    const _categories = [];
    categories.forEach(category => {
      _categories.push({name: category.title});
    });
    return _categories;
  }

  /**
   * Parses the `tags` field returned from API and
   * prepares an array of objects containing the name of each tag.
   *
   * @param  {array} tags - The tags array returned from API.
   * @return {array} Array of objects containing name of each tag.
   */
  function defineTags(tags) {
    const _tags = [];
    tags.forEach(tag => {
      _tags.push({name: tag.title});
    });
    return _tags;
  }


} /****************************************************************************************/



