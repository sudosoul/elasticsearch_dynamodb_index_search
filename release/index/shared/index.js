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
const ES       = require('elasticsearch'); // ElasticSearch SDK
const template = require('./template');    // Index Settings & Mappings

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
      log:          'error',
      apiVersion:   this.version,
      keepAlive:    false  // DO NOT CHANGE - LIBRARY CRASHSES WITHOUT THIS SET TO FALSE @see https://github.com/elastic/elasticsearch-js/issues/521 
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
  insert(index, id, doc) {
    const self = this;
    return new Promise((fulfill, reject) => {
      // Check if index exists:
      self.es.indices.exists({index: index})
        .then(exists => {
          // Create index if it doesn't already exist:
          if (!exists) {
            self._createIndex(index, template)
              .then((res) => {
                // Insert document into newly created index:
                self._insert(index, id, doc)
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
            self._insert(index, id, doc)
              .then((success) => {
                fulfill(true); // fulfill when complete!
            }).catch(e => {
              console.log('Error inserting document %s', id);
              reject(e);
            });
          }
      }).catch(e => {
        console.log('Error checking if index exists for %s', index);
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
  _insert(index, id, doc) {
    return this.es.index({
      index:   index,
      type:    'content',
      id:      id,
      body:    doc,
      refresh: true
    });
  }

  /**
   * Remove an existing document from the specified index.
   *
   * @param    {string} index - The name of the index to remove the document from.
   * @return   {Promise.<string,Error>}
   * @fulfills {string}       Response body from ES delete request.
   * @rejects  {Error}        An ES Error.
   */
  remove(index, id) {
    return this.es.delete({
      index:   index,
      type:    'content',
      id:      id,
      refresh: true
    });
  }

  /**
   * Creates a new index.
   *
   * @param    {string} name     - The name of the index to create.
   * @param    {object} template - Object containing the index template.
   * @return   {Promise.<string,Error>}
   * @fulfills {string}         Response body from ES delete request.
   * @rejects  {Error}          An ES Error.
   */
  _createIndex(name, template) {
    return this.es.indices.create({
      index: name,
      body:  template
    });
  }

}

//** Expose this Index Class **//
module.exports = Index;


