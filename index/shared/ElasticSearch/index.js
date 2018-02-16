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
   * @param {string} version  - The ES API Version to use.
   */
  constructor(endpoint, version) {
    // Set ES Endpoint:
    if (!endpoint) {
      throw 'Endpoint not provided.';
    } else {
      this.endpoint = endpoint;
    }
    // Set ES API Version:
    if (!version) {
      throw 'Version not provided.';
    } else {
      this.version = version;
    }
    // Instantiate new ES Client:
    this.es = new ES.Client({
      host:         this.endpoint, 
      log:          'trace',
      apiVersion:   this.version
      sniffOnStart: true
    }); 
  }

  /**
   * Inserts a new document into an idex, or update an existing one.
   * Creates the index if it doesn't already exist. 
   *
   * @param    {string} index - The name of the index to insert the document under.
   * @param    {string} id.   - The document ID.
   * @param    {object} doc   - The document object to insert.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean}        Fulfills true on insert success.
   * @rejects  {InsertError}    Error inserting the document.
   * @rejects  {IndexError}     Error creating an index. 
   */
  insertDocument(index, id, doc) {
    const self = this;
    return new Promise((fulfill, reject) => {
      // Check if index exists:
      self.es.indices.exists(index)
        .then(exists => {
          // Create index if it doesn't already exist:
          if (!exists) {
            self.createIndex(index, model)
              .then(() => {
                // Insert document into newly created index:
                self._insertDocument(index, id, doc)
                  .then((success) => {
                    fulfill(true); // fulfill when complete!
                }).catch(e => {
                  console.log('Error inserting document %s', id);
                  reject(e);
                });
            }).catch(e => {
              console.log('Error creating index for %s.', index);
              reject(e);
            });
          } else {
            // Else Insert document into existing index:
            self._insertDocument(index, id, doc)
              .then((success) => {
                fulfill(true); // fulfill when complete!
            }).catch(e => {
              console.log('Error inserting document %s', id);
              reject(e);
            });
          }
      }).catch(e => {
        console.log('Error checking if index exists for %s', site);
        reject (e);   
      });
    });
  }

  /**
   * Inserts a new document into the specified index.
   * Helper for insertDocument()
   * 
   * @param    {string} index - The name of the index to insert the document under.
   * @param    {string} id.   - The document ID.
   * @param    {object} doc   - The document object to insert.
   * @return   {Promise.<string,Error>}
   * @fulfills {string}         Response body from ES insert request.
   * @rejects  {Error}          An ES error.
   */
  _insertDocument(index, id, doc) {
    return this.es.index({
      index:   index,
      id:      id,
      body:    doc,
      refresh: true
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
      index:   index,
      id:      id,
      refresh: true
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
      body:  model
    });
  }

}

//** Expose this Index Class **//
module.exports = Index;


