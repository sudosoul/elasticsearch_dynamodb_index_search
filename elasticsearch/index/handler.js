/**
 * Lambda Function to Index Data in ElasticSearch
 *
 * This service is attached as a trigger to the following DynamoDB tables: 
 *  PROD.CONTENT.CONTENT_METADATA.
 *
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION      - The AWS Region, available by default by Lambda.
 *  STAGE           - The development stage (dev, staging, prod).
 *  ES_ENDPOINT     - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION      - The version of ElasticSearch used on our cluster.
 *  
 *
 * @requires api.js
 * @requires index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Import Dependencies:
const Content = require('./Content/content'); 

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
  //** Ensure all Environment Variables Set **//
  if (!process.env.STAGE || !process.env.ES_ENDPOINT || !process.env.ES_VERSION) {
    console.log('Error - environment variables not set. Required environment variables are STAGE, ES_ENDPOINT, and ES_VERSION');
    return callback('Not all required environment variables were set.');
  }
  //** Instantiate required classes **//
  const content = new Content(); 

  //** Iterate through DynamoDB Events **//
  const processing = []; 
  event.Records.forEach(record => {
    //** Index According to Table **//
    const table = record.eventSourceARN.replace(/arn:aws:dynamodb:.*?:.*?:table\//,'').replace(/\/stream.*/,'');; // Get Table Name from ARN
    switch (table) {
      // Index Content Data:
      case 'DEVELOP.CONTENT.CONTENT_METADATA_INDEX-DEMO8':
        processing.push(content.index(record));
        break;
      
      // add new cases for each DynamoDB table we want to index  
      // case 'some.users.table':
      //   processing.push(users.index(record));
      //   break;
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
      failed ? console.log('Failed processing %d/%d events.', failed, total) : null;
      if (failed > 0) {
        // Exit Lambda with FAILED status:
        return callback('There was an error processing ' +failed +' events!');
      } else {
        // Exit Lambda with SUCCESS status:
        return callback(null, 'Successfully processed all ' +total +' events!');
      }
  }); 

}