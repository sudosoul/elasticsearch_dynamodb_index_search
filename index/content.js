/**
 * Lambda Function to Index Content Data
 *
 * This service is attached as a trigger to the following DynamoDB table: PROD.CONTENT.CONTENT_METADATA.
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
 *
 * @requires viewlift.js
 * @requires es_index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const API  = require('./shared/ViewLift/api.js');         // Custom VL API Module
const ESI = require('./shared/ElasticSearch/index.js');  // Custom ES Index Module

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
  // Instantiate VL API & ES Index Classes..
  const api = new API(process.env.STAGE, 'server'); // Custom ViewLift API Class
  const esi = new ESI(process.env.ES_ENDPOINT);     // Custom ElasticSearch Indexing Class

  //** Iterate through DynamoDB Events **//
  const processing = []; 
  event.Records.forEach(record => {
    //** Perform Async Indexing & Push Promise to Array **// 
    processing.push(indexContent(record)); 
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
} //exports.handler

/**
 * Handle indexing for content
 * @param record <mixed> - The DynamoDB Event Record.
 * @todo
 */
function indexContent(record) {
  // Determine & Handle Event Type (INSERT/MODIFY/DELETE)
  switch (record.eventName) {
    case 'INSERT':
      // We do not currently index on INSERT events - 2/13/18
      //insertDocument(null, record);
      break;
    case 'MODIFY':
      //modifyDocument(null, record);
      break;
    case 'REMOVE':
      //removeDocument(null, record);
      break;
  }
}

/**
 * Parses the indexable data fields from a DynamoDB
 * record & prepares the document body object. 
 * Called during INSERT & MODIFY events.
 * @param data <mixed> - The data being parsed.
 * @return <mixed>     - The ES-upload-ready object.
 */
function getDocBody(record) {
  switch (record.dynamodb.NewImage.objectKey) {
    case 'video':
      return _prepareVideoDocBody(record);
      break;
  }
}

/**
 * Parses the indexable data fields from a DynamoDB
 * Video record & returns the document body object. 
 * Called during INSERT & MODIFY events.
 * @param data <mixed> - The data being parsed.
 * @return <mixed>     - The document object.
 */   
function _prepareVideoDocBody(record) {
  return {
    contentType:   record.dynamodb.NewImage.objectKey,
    url:           record.dynamodb.NewImage.permalink, 
    imageUrl:      record.dynamodb.NewImage.videoImage.url || record.dynamodb.NewImage.posterImage.url,
    description:   record.dynamodb.NewImage.description,
    runtime:       record.dynamodb.NewImage.runtime,
    status:        record.dynamodb.NewImage.status,
    logLine:       null,
    creditBlocks:  null,
    isTrailer:     null,
  }
}

