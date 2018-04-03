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
 *  5. RELEASE.CONTENT.AUDIO
 *  6. RELEASE.CONTENT.PHOTOGALLERY
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

// Import & Instantiate Dependencies:
const Videos   = new require('./content/videos');   // Import video    content type class
const Series   = new require('./content/series');   // Import series   content type class
const Articles = new require('./content/articles'); // Import articles content type class
const Events   = new require('./content/events');   // Import events   content type class
const Audio    = new require('./content/audio');    // Import audio    content type class
const Photos   = new require('./content/photos');   // Import photos   content type class

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
    //** Parse Table Name, Event Action, Site, ID, DynamoDB Image **//
    const table  = record.eventSourceARN.replace(/arn:aws:dynamodb:.*?:.*?:table\//,'').replace(/\/stream.*/,''); // Get Table Name from ARN
    const action = (record.eventName === 'INSERT' || record.eventName === 'MODIFY') ? 'INSERT' : 'REMOVE';        // Determine action to perform on index (insert or remove)
    const site   = record.dynamodb.Keys.site.S;
    const id     = record.dynamodb.Keys.id.S;
    const image  = record.dynamodb.NewImage ? record.dynamodb.NewImage : record.dynamodb.OldImage; // Set image to NewImage if NewImage defined (INSERT/MODIFY events) else set it to OldImage (REMOVE event)
    let   type   = null;
    //** Index According to Table **//
    switch (table) {  
      // Index Video Data:
      case 'RELEASE.CONTENT.CONTENT_METADATA':
        type = image.objectKey.S; 
        if (type === 'video') processing.push(Videos.index(action, site, id));
        else console.log('Skipping unsupported metadata type - ', type);
        break;     
      // Index Series Data:
      case 'RELEASE.CONTENT.SERIES':       
        if (!image.objectType) processing.push(Series.index(action, site, id, image)); // Only index series that have no objectType defined
        else console.log('Skipping unsupported series type');
        break;     
      // Index Article Data:
      case 'RELEASE.CONTENT.ARTICLE':
        processing.push(Articles.index(action, site, id));
        break;
      // Index Event Data:
      case 'RELEASE.CONTENT.EVENT':
       type = image.contentType.S;
       if (type === 'EVENT') processing.push(Events.index(action, site, id));
       else console.log('Skipping unsupported event type - ', type);
       break;
      // Index Audio Data:
      case 'RELEASE.CONTENT.AUDIO':
        type = image.contentType.S;
        if (type === 'AUDIO') processing.push(Audio.index(action, site, id));
        else console.log('Skipping unsupported audio type - ', type);
        break;
      // Index PhotoGallery Data:
      case 'RELEASE.CONTENT.PHOTOGALLERY':
        type = image.contentType.S;
        if (type === 'IMAGE') processing.push(Photos.index(action, site, id));
        else console.log('Skipping unsupported photo type - ', type);
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
