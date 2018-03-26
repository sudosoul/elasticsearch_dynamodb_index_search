/**
 * Lambda Function to Index Data in ElasticSearch
 *
 * This service is attached as a trigger to the following DynamoDB tables: 
 *  RELEASE.CONTENT.CONTENT_METADATA.
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
const Videos = require('./content/videos'); // Import video content type class
const Series = require('./content/series'); // Import video content type class

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
  const videos = new Videos();
  const series = new Series(); 

  //** Iterate through DynamoDB Events **//
  const processing = []; 
  event.Records.forEach(record => {
    //** Index According to Table **//
    const table  = record.eventSourceARN.replace(/arn:aws:dynamodb:.*?:.*?:table\//,'').replace(/\/stream.*/,''); // Get Table Name from ARN
    const action = (record.eventName === 'INSERT' || record.eventName === 'MODIFY') ? 'INSERT' : 'REMOVE';       // Determine action to perform on index (insert or remove)
    switch (table) {
      // Index Video Data:
      case 'RELEASE.CONTENT.CONTENT_METADATA':
        const type = record.dynamodb.NewImage ? record.dynamodb.NewImage.objectKey.S : record.dynamodb.OldImage.objectKey.S; // NewImage only exists on Insert/Modify events, OldImage must be used on Remove
        if (type === 'video') processing.push(this.videos.index(action, record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S));
        else console.log('Skipping unsupported metadata type - ', type);
        break;
      // Index Series Data:
      case 'RELEASE.CONTENT.SERIES':
        const image = record.dynamodb.NewImage ? record.dynamodb.NewImage : record.dynamodb.OldImage;
        if (!image.objectType) processing.push(this.series.index(action, record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S, image)); // Only index series that have no objectType defined
        else console.log('Skipping unsupported series type');
        break;
    }
  });

  //** Wait for all events to be processed, Regardless of success **//
  Promise.all(processing.map(p => p.catch(e => e)))
    .then(processed => {
      console.log('All records processed!');
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
      if (failed) {
        // Exit Lambda with FAILED status:
        console.log('Failed processing %d/%d events.', failed, total);
        return callback('There was an error processing ' +failed +' events!');
      } else {
        // Exit Lambda with SUCCESS status:
        return callback(null, 'Successfully processed all ' +total +' events!');
      }
  }); 

};
