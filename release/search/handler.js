/**
 * Lambda Function to Search Video Content Data in ElasticSearch
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
 * @param {Error}         error   - Optional error object to indicate Lambda failure. 
 * @param {object|string} success - Optional JSON.stringify compatible object or string to indicate Lambda success.
 */
exports.handler = function(event, context, callback) {
  // Instantiate new Search Class:
  const search = new Search(process.env.ES_ENDPOINT, process.env.ES_VERSION, event.queryStringParameters.site);
  // Perform Suggest Video Search:
  search.suggestVideos(event.queryStringParameters.searchTerm, event.queryStringParameters.showTrailers || false)
    .then(results => {
      // Push just the data of the results into `result` array:
      const result = [];
      if (results.hits.hits.length > 0) {
        results.hits.hits.forEach(hits => {
          result.push(hits._source.data);
        });
      }
      // Return array of results to client:
      return callback(null, prepareResponse(200, result));
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

}
