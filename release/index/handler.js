/**
 * Lambda Function to Index Data in ElasticSearch
 * /////////////////////////////////////////////////////////////////////////
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
 * /////////////////////////////////////////////////////////////////////////
 * =========================================================================
 * This service is attached as a trigger to the following DynamoDB tables: 
 * -------------------------------------------------------------------------
 *  1. RELEASE.CONTENT.CONTENT_METADATA
 *  2. RELEASE.CONTENT.SERIES
 *  3. RELEASE.CONTENT.ARTICLE
 *  4. RELEASE.CONTENT.EVENT
 * =========================================================================
 * /////////////////////////////////////////////////////////////////////////
 * =========================================================================
 * REQUIRED ENVIRONMENT VARIABLES
 * -------------------------------------------------------------------------
 *  1. AWS_REGION      - The AWS Region, available by default by Lambda.
 *  2. STAGE           - The development stage (dev, staging, prod).
 *  3. ES_ENDPOINT     - The URL endpoint to the ElasticSearch cluster.
 *  4. ES_VERSION      - The version of ElasticSearch used on our cluster.
 * =========================================================================  
 * /////////////////////////////////////////////////////////////////////////
 * @requires content/videos.js
 * @requires content/series.js
 * @requires content/articles.js
 * /////////////////////////////////////////////////////////////////////////
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Import Dependencies:
const Videos   = require('./content/videos');   // Import video    content type class
const Series   = require('./content/series');   // Import series   content type class
const Articles = require('./content/articles'); // Import articles content type class
const Events   = require('./content/articles'); // Import articles content type class

// Instantiate Required Content Classes:
const videos   = new Videos();
const series   = new Series();
const articles = new Articles();
const events   = new Events();

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
  //** Iterate through DynamoDB Events **//
  const processing = []; 
  event.Records.forEach(record => {
    const table  = record.eventSourceARN.replace(/arn:aws:dynamodb:.*?:.*?:table\//,'').replace(/\/stream.*/,''); // Get Table Name from ARN
    const action = (record.eventName === 'INSERT' || record.eventName === 'MODIFY') ? 'INSERT' : 'REMOVE';        // Determine action to perform on index (insert or remove)
    //** Index According to Table **//
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
      // Index Article Data:
      case 'RELEASE.CONTENT.ARTICLE':
        processing.push(this.articles.index);
        break;
      // Index Event Data:
      // case 'RELEASE.CONTENT.EVENT':
      //  processing.push(this.events.index);
      //  break;
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
