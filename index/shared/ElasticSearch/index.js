/**
 * ViewLift ElasticSearch DynamoDB Indexing Functions
 * Contains functions to perform common indexing operations in ElasticSearch.
 *
 * @requires elasticsearch
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 1.0.0
 */

// Load Dependencies:
const ES    = require('elasticsearch'); // ElasticSearch SDK
const model = require('./model');       // Index Settings & Mappings

class Index {

  /**
   * Constructor
   *
   * @param {string} endpoint - The ElasticSearch host URL/Endpoint.
   */
  constructor(endpoint) {
    // Set ES Endpoint:
    if (!endpoint) {
      throw 'Endpoint not provided.';
    } else {
      this.endpoint = endpoint;
    }
    this.es = ES.Client({host: this.endpoint, log: 'trace'}); // Initialize ES Client
  }

  /**
   * Modify an existing document in an existing index.
   *
   * @param {string} index - The name of the index containing the document to modify.
   * @param {string} id    - The ID of the document to modify. 
   * @param {object} doc   - The replacing document object.
   */
  modifyDocument(record) {
    console.log('Processing MODIFY Event, printing record...');
    console.log(record);
  }

  /**
   * Insert a new document into an idex.
   * Creates the index if it doesn't already exist. 
   *
   * @param    {string} index - The name of the index to insert the document.
   * @param    {object} doc   - The document object to insert.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean}        Fulfills true on insert success.
   * @rejects  {InsertError}    Error inserting the document.
   * @rejects  {IndexError}     Error creating an index. 
   */
  insertDocument(index, doc) {
    const self = this;
    return new Promise((fulfill, reject) => {
      // Check if index exists:
      self.es.indices.exists(record.dynamodb.Keys.site)
        .then(exists => {
          // Create index if it doesn't already exist:
          if (!exists) {
            self.createIndex(es, record.dynamodb.Keys.site, getIndexModel())
              .then(() => {
                // Insert document into newly created index:
                self._insertDocument(es, record)
                  .then(() => {
                    fulfill(); // fulfill when complete!
                }).catch(e => {
                  console.log('Error inserting document %s', record.dynamodb.NewImage.id);
                  reject(e);
                });
            }).catch(e => {
              console.log('Error creating index for %s.', record.dynamodb.Keys.site);
              reject(e);
            });
          } else {
            // Else Insert document into existing index:
            self._insertDocument(es, record)
              .then(() => {
                fulfill(); // fulfill when complete!
            }).catch(e => {
              console.log('Error inserting document %s', record.dynamodb.NewImage.id);
              reject(e);
            });
          }
      }).catch(e => {
        console.log('Error checking if index exists for %s', record.dynamodb.Keys.site);
        reject (e);   
      });
    });
  }

  /**
   * Inserts a new document into the specified index.
   * Helper for insertDocument()
   * 
   * @param    {string} index - The name of the index to insert the document.
   * @param    {object} doc   - The document object to insert.
   * @return   {Promise.<string,Error>}
   * @fulfills {string}         Response body from ES insert request.
   * @rejects  {Error}          An ES error.
   */
  _insertDocument(index, doc) {
    return this.es.index({
      index: record.dynamodb.Keys.site,
      type:  record.dynamodb.NewImage.objectKey,
      id:    record.dynamodb.NewImage.id,
      body:  this.getDocBody(record)
    });
  }

  /**
   * Remove an existing document from the specified index.
   *
   * @param  {string} index - The name of the index to insert the document.
   * @return {Promise.<string,Error>}
   * @fulfills {string}       Response body from ES delete request.
   * @rejects  {Error}        An ES Error.
   */
  removeDocument(index, id) {
    return this.es.delete({
      index: record.dynamodb.Keys.site,
      type:  record.dynamodb.NewImage.objectKey,
      id:    record.dynamodb.NewImage.id
    });
  }

  /**
   * Creates a new index.
   *
   * @param    {string} name  - The name of the index to create.
   * @param    {object} model - Object containing the settings & mappings for the index.
   * @return   {Promise.<string,Error>}
   * @fulfills {string}         Response body from ES delete request.
   * @rejects  {Error}          An ES Error.
   */
  createIndex(name, model) {
    return this.es.indices.create({
      index: name,
      body: data
    });
  }

  /**
   * Returns the appopriate model object containing
   * settings & mapping for a specified index.
   */ 
  getIndexModel() {
    return model;
  }

}

//** Expose this Index Class **//
module.exports = Index;


