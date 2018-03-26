/**
 * Indexes Series
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION  - The AWS Region, available by default by Lambda.
 *  STAGE       - The development stage (dev, staging, prod).
 *  ES_ENDPOINT - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION  - The version of ElasticSearch used on our cluster.
 *  
 *
 * @requires api.js
 * @requires index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const AWS                = require('aws-sdk');                                           // Official AWS SDK
const docClient          = new AWS.DynamoDB.DocumentClient();                            // Legacy 
const dynamodbTranslator = docClient.getTranslator();                                    // Legacy
const ItemShape          = docClient.service.api.operations.getItem.output.members.Item; // Legacy
const Index              = require('../shared/index');                                   // Import the parent Index class

/**
 * Performs indexing operations for series documents.
 * This class is called to either insert or remove a series document from a given index.
 */
class Series extends Index {

  /**
   * Constructor
   */
  constructor() {
    super(process.env.ES_ENDPOINT, process.env.ES_VERSION);
  }

  /**
   * Removes or Inserts a series document into an index specified by site.
   *
   * @param    {string} action  - `insert` | `remove` - insert or remove the doc.
   * @param    {string} site    - The site the series belongs to, also the name of the index.
   * @param    {string} id      - The ID of the series to insert, or the ID of the document to remove.
   * @param    {object} image   - The raw DynamoDB series image
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean} - True on success
   * @rejects  {Error}   - Error on fail
   */
  index(action, site, id, image) {
    const self = this;
    return new Promise((fulfill, reject) => {     
      //** Insert/Modify Document **//
      if (action === 'INSERT') {
        const doc = _prepareDocument(image);          
        self.insert(site, 'series', id, doc)  // Insert the document..
          .then(success => {
            fulfill(true);                    // Document successfully inserted!
        }).catch(e => {
          reject(e);                          // Error inserting document!
        });      
      //** Remove Document **//
      } else if (action === 'REMOVE') {
        self.remove(site, 'series', id)       // Remove the document
          .then(success => {
            fulfill(true);                    // Document successfully removed!
        }).catch(e => {
          reject(e);                          // Error removing document!
        });
      }
    });
  }

  /**
   * Prepare the series document for indexing.
   * 
   * NOTE: Unlike other content, this indexes the data directly retrieved
   * from DynamoDB, and does not make any API calls to the ViewLift API
   * This is due to legacy reasons, and for those reasons, we translate
   * the retrieved DynamoDB image into functional JSON.
   * 
   * @param    {object} image - The raw DynamoDB series image.
   * @return   {object}       - Formatted document object for indexing.
   */   
  _prepareDocument(image) {
    const item = dynamodbTranslator.translateOutput(image, ItemShape); // Convert DynamoDB image JSON to standard JSON
    const doc = {
      type                  : 'series',
      seriesTitle           : item.gist.title,
      seriesDescription     : item.gist.description,
      seriesPrimaryCategory : item.gist.primaryCategory.title,
      seriesCategories      : this._defineCategories(item.categories),
      seriesPeople          : this._definePeople(item.creditBlocks),
      seriesTags            : this._defineTags(item.tags),
      status                : item.showDetails.status,
      data                  : item
    };
    return doc;
  }

  /**
   * Parses the `creditBlocks` field present in DynamoDB image and
   * prepares an array of objects containing the name of each
   * actor and directors found in the `creditBlocks`.
   *
   * @param  {array} creditBlocks - The creditBlocks array returned from API.
   * @return {array} Array of objects containing name of each actor/director.
   */
  _definePeople(creditBlocks) {
    const people = [];
    creditBlocks.forEach(block => {
      if (block.credits) {
        block.credits.forEach(credit => {
          people.push({name: credit.title});
        });
      }
    });
    return people;
  }

  /**
   * Parses the `categories` field present in DynamoDB image and
   * prepares an array of objects containing the name of each category.
   *
   * @param  {array} categories - The categories array returned from API.
   * @return {array} Array of objects containing name of each category.
   */
  _defineCategories(categories) {
    const _categories = [];
    categories.forEach(category => {
      _categories.push({name: category.title});
    });
    return _categories;
  }

  /**
   * Parses the `tags` field present in DynamoDB image and
   * prepares an array of objects containing the name of each tag.
   *
   * @param  {array} tags - The tags array returned from API.
   * @return {array} Array of objects containing name of each tag.
   */
  _defineTags(tags) {
    const _tags = [];
    tags.forEach(tag => {
      _tags.push({name: tag.title});
    });
    return _tags;
  }

}

//** Expose this Series Class **//
module.exports = Series;
