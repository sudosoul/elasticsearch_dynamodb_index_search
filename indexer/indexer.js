/**
 * DynamoDB to ElasticSearch Indexing Service for Content.
 *
 * This service is attached as a trigger to the following DynamoDB table: PROD.CONTENT.CONTENT_METADATA.
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const VL  = require('./viewlift');    // Custom VL API Module
const ESI = require('./es_index.js'); // Custom ES Index Module

//** Lambda Entry Point - Execution Begins Here **//
exports.handler = function(event, context, callback) {
  // Instantiate VL API & ES Index Classes:
  const vl  = new VL(process.env.STAGE, 'server'); // Custom ViewLift API Class
  const esi = new ESI(process.env.ES_ENDPOINT);    // Custom ElasticSearch Indexing Class

  // Iterate through DynamoDB Events...
  const processed = []; // Initialize empty array to track when all records processed.
  event.Records.forEach(record => {
    // Determine & Handle Table Event Source:
    const table = record.eventSourceARN.replace(/arn:aws:dynamodb:.*?:.*?:table\//, '').replace(/\/stream\/.*/, ''); // Parse table name from ARN
    switch (table) {
      // Content Updates:
      case 'DEVELOP.CONTENT.CONTENT_METADATA':
        let p = indexContent(record);
        processed.push(p);
        break;
    }
  });

  //****** @todo complete flow: table --> event type --> get item --> prepare document --> upload document ******//

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

  // /**
  //  * Parses the indexable data fields from a DynamoDB
  //  * record & prepares the document body object. 
  //  * Called during INSERT & MODIFY events.
  //  * @param data <mixed> - The data being parsed.
  //  * @return <mixed>     - The ES-upload-ready object.
  //  */
  // function getDocBody(record) {
  //   switch (record.dynamodb.NewImage.objectKey) {
  //     case 'video':
  //       return _prepareVideoDocBody(record);
  //       break;
  //   }
  // }

  // *
  //  * Parses the indexable data fields from a DynamoDB
  //  * Video record & returns the document body object. 
  //  * Called during INSERT & MODIFY events.
  //  * @param data <mixed> - The data being parsed.
  //  * @return <mixed>     - The document object.
   
  // function _prepareVideoDocBody(record) {
  //   return {
  //     contentType:   record.dynamodb.NewImage.objectKey,
  //     url:           record.dynamodb.NewImage.permalink, 
  //     imageUrl:      record.dynamodb.NewImage.videoImage.url || record.dynamodb.NewImage.posterImage.url,
  //     description:   record.dynamodb.NewImage.description,
  //     runtime:       record.dynamodb.NewImage.runtime,
  //     status:        record.dynamodb.NewImage.status,
  //     logLine:       null,
  //     creditBlocks:  null,
  //     isTrailer:     null,
  //   }
  // }
}




