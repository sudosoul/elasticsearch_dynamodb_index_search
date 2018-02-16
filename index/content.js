/**
 * Lambda Function to Index Content Data
 *
 * This service is attached as a trigger to the following DynamoDB table: PROD.CONTENT.CONTENT_METADATA.
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
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
    //** Perform Async Indexing & Push Promise to Array **// 
    const type = record.dynamodb.NewImage.objectKey.S;
    if (type === 'video') { // Only handle events with supported content type
      processing.push(handleEvent(record)); 
    }
  });

  //** Wait for all events to be processed, Regardless of success **//
  Promise.all(processing.map(p => p.catch(e => e)))
    .then(processed => {
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
      if (failed >= 0) {
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
      prepareDocument(record.dynamodb.NewImage.objectKey.S, record.dynamodb.Keys.id.S)
        .then(doc => {
          esi.insertDocument(record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S, doc)
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
      prepareDocument(record.dynamodb.NewImage.objectKey.S, record.dynamodb.Keys.id.S)
        .then(doc => {
          esi.insertDocument(record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S, doc)
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
      esi.removeDocument(record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S)
        .then(success => {
          fulfill(true);
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * Prepares the document body object for insert/modify events.
   *
   * @param    {object} record - The DynamoDB Event Record.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}          The document body object.
   * @rejects  {Error}           A VL API Error.
   */
  function prepareDocument(record) {
    switch (record.dynamodb.NewImage.objectKey.S) {
      case 'video':
        return _prepareVideoDocument(record);
    }
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
  function _prepareVideoDocument(record) {
    return new Promise((fulfill, reject) => {
      // Get Complete Video Data from API:
      api.getVideo(record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S)
        .then(video => {
          // Define & Build Document Body:
          const doc = {
            title:          video.gist.title,
            suggest:        defineSuggestions(video.gist.title),
            type:           'video',
            description:    video.gist.description,
            status:         video.contentDetails.status,
            creditBlocks:   video.creditBlocks,
            isTrailer:      video.gist.isTrailer || false,
            free:           video.gist.free
            year:           video.gist.year,
            parentalRating: video.gist.parentalRating,
            gist:           video.gist
          };
          // Fulfill with video document:
          fulfill(doc);
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * @todo
   * Define the auto-suggest keywords.
   * @param {string} title - The video title.
   * @return {object} Object containing the suggestion definitions.
   */
  function defineSuggestions(title) {

  }
} /****************************************************************************************/