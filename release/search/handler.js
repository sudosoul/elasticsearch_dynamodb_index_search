/**
 * Lambda Function to Search Content Data in ElasticSearch
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION      - The AWS Region, available by default by Lambda.
 *  STAGE           - The development stage (dev, staging, prod).
 *  ES_ENDPOINT     - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION      - The version of ElasticSearch used on our cluster. 
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Import Dependencies
const Search = require('./search');

/**
 * Lambda Entry Point
 * Performs search queries on ElasticSearch
 *
 * @param {object} event            - The DynamoDB/Caller Event data. Contains the DynamoDB record data.
 * @param {object} context          - Object containing runtime information for this Lambda function.
 * @param {LambdaCallback} callback - The callback that handles the Lambda completion.
 *
 * @callback LambdaCallback
 * @param {Error}         error     - Optional error object to indicate Lambda failure. 
 * @param {object|string} success   - Optional JSON.stringify compatible object or string to indicate Lambda success.
 */
exports.handler = function(event, context, callback) {
  const search = new Search(process.env.ES_ENDPOINT, process.env.ES_VERSION, event.queryStringParameters.site); // Instantiate Search Class
  //** Get Content Suggestions **//
  search.getSuggestions(event.queryStringParameters.searchTerm, event.queryStringParameters.types)
    .then(results => {
      return callback(null, prepareResponse(200, results)); // Return array of results back to client!
  }).catch(e => {
    console.log('Error - ', e);
    return callback(e);
  });

  /**
   * Prepares & Formats the Lamdba HTTP Response
   * @param {number} statusCode - The HTTP response code.
   * @param {array}  body       - JSON response object.
   * @return {object}           - Lambda formatted Response.
   */
  function prepareResponse(statusCode, body) {
    return {
      statusCode      : statusCode,
      body            : JSON.stringify(body), 
      headers: {"Access-Control-Allow-Origin": "*"},
      isBase64Encoded : false
    };
  }

};
