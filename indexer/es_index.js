/**
 * ViewLift ElasticSearch DynamoDB Indexing Functions
 * Contains functions to perform common indexing operations in ElasticSearch.
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
   * @param endpoint
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
   * @param record <mixed> - DynamoDB Record.
   */
  modifyDocument(record) {
    console.log('Processing MODIFY Event, printing record...');
    console.log(record);
  }

  /**
   * Insert a new document into an existing index, or
   * create index if it doesn't already exist. 
   * @param record <mixed> - DynamoDB Record.
   */
  insertDocument(index, doc) {
    const self = this;
    return new Promise((resolve, reject) => {
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
                    resolve(); // Resolve when complete!
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
                resolve(); // Resolve when complete!
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
   * Inserts a new document into an existing index.
   * Helper for insertDocument()
   * @param record <mixed> - DynamoDB Record.
   * @return Promise
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
   * Remove an existing document from an existing index.
   * @param record <mixed> - DynamoDB Record.
   * @return Promise
   */
  removeDocument(index, doc) {
    return this.es.delete({
      index: record.dynamodb.Keys.site,
      type:  record.dynamodb.NewImage.objectKey,
      id:    record.dynamodb.NewImage.id
    });
  }

  /**
   * Creates a new index.
   * @param name
   * @param model
   * @return Promise
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


module.exports = Index;


