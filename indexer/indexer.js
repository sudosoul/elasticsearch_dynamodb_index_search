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
const Config  = require('./config');      // Local Config
const AWS     = require('aws-sdk');       // AWS SDK
const ES      = require('elasticsearch'); // ElasticSearch Client
const Request = require('request');       // HTTP Request Library
const model   = require('./model');       // Index Model - Settings & Mappings
const es      = new ES.Client({host: Config.es.endpoint, log: 'trace'}); // Initialize ES Client!

/**
 * Modify an existing document in an existing index.
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 */
function modifyDocument(es, record) {
  console.log('Processing MODIFY Event, printing record...');
  console.log(record);
}

/**
 * Insert a new document into an existing index, or
 * create index if it doesn't already exist. 
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 */
function insertDocument(es, record) {
  return new Promise((resolve, reject) => {
    // Check if index exists:
    es.indices.exists(record.dynamodb.Keys.site)
      .then(exists => {
        // Create index if it doesn't already exist:
        if (!exists) {
          createIndex(es, record.dynamodb.Keys.site, getIndexModel())
            .then(() => {
              // Insert document into newly created index:
              _insertDocument(es, record)
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
          _insertDocument(es, record)
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
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 * @return Promise
 */
function _insertDocument(es, record) {
  return es.index({
    index: record.dynamodb.Keys.site,
    type:  record.dynamodb.NewImage.objectKey,
    id:    record.dynamodb.NewImage.id,
    body:  getDocBody(record)
  });
}

/**
 * Remove an existing document from an existing index.
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 * @return Promise
 */
function removeDocument(es, record) {
  return es.delete({
    index: record.dynamodb.Keys.site,
    type:  record.dynamodb.NewImage.objectKey,
    id:    record.dynamodb.NewImage.id
  });
}

/**
 * Creates a new index.
 * Called on INSERT events.
 * @param es
 * @param name
 * @param model
 * @return Promise
 */
function createIndex(es, name, model) {
  return es.indices.create({
    index: name,
    body: data
  });
}

/**
 * Returns the appopriate model object containing
 * settings & mapping for a specified index.
 */ 
function getIndexModel() {
  return model;
}

/**
 * Parses the indexable data fields from a DynamoDB
 * record & returns the document body object. 
 * Called during INSERT & MODIFY events.
 * @param data <mixed> - The data being parsed.
 * @return <mixed>     - The ES-upload-ready object.
 */
function getDocBody(record) {
  switch (record.dynamodb.NewImage.objectKey) {
    case 'video':
      return _prepareVideoDocBody(record);
      break;
  }
}

/**
 * Parses the indexable data fields from a DynamoDB
 * Video record & returns the document body object. 
 * Called during INSERT & MODIFY events.
 * @param data <mixed> - The data being parsed.
 * @return <mixed>     - The document object.
 */
function _prepareVideoDocBody(record) {
  return {
    contentType:   record.dynamodb.NewImage.objectKey,
    url:           record.dynamodb.NewImage.permalink, 
    imageUrl:      record.dynamodb.NewImage.videoImage.url || record.dynamodb.NewImage.posterImage.url,
    description:   record.dynamodb.NewImage.description,
    runtime:       record.dynamodb.NewImage.runtime,
    status:        record.dynamodb.NewImage.status,
    logLine:       null,
    creditBlocks:  null,
    isTrailer:     null,
    _row:          null
  }
}

// title: item.gist.title,
//         contentType: item.gist.contentType,
//         url: item.gist.permalink,
//         imageUrl: item.contentDetails.videoImage.url || item.contentDetails.posterImage.url,
//         description: item.gist.description,
//         runtime: item.gist.runtime,
//         status: item.contentDetails.status,
//         logLine: item.gist.logLine,
//         creditBlocks: item.creditBlocks,
//         isTrailer: item.gist.isTrailer || false,
//         _row: JSON.stringify(item)

/**
 * GETS content metadata from VL API for specified content ID.
 * @param site  <string> - The site hosting the content.
 * @param cid   <string> - The content ID to retrieve metadata for.
 * @return      <mixed>  - Object containing the content metadata.
 */
function getContentMeta(site, cid) {
  return new Promise((resolve, reject) => {
    _getAuthorizationToken(site)          // Retrieve VL API token for site.
      .then(token => {
        _getContentMeta(site, token, cid) // Retrieve content metadata from VL API.
          .then(meta => {
            resolve(meta);                // Return the content metadata.
        }).catch(e => {
          console.log("Error getting content metadata from API - ", e);
          reject(e);                      // Error getting metadata, return error.
        });
    }).catch(e => {
      console.log("Error getting API token for site %s - ", site, e);
      reject(e);                          // Error getting VL API token, return error.
    });
  });
}

/**
 * GETS content metadata from VL API for specified content ID.
 * Helper for getContentMeta().
 * @param site  <string> - The site hosting the content.
 * @param token <string> - The VL API token.
 * @param cid   <string> - The content ID to retrieve metadata for.
 * @return      <mixed>  - Object containing the content metadata.
 */
function _getContentMeta(site, token, cid) {
  return new Promise((resolve, reject) => {
    Request({
      url: 'https://' + Config.stage + '-api.viewlift.com/content/videos',
      method: 'GET',
      qs: { 
        site: site, 
        ids:  cid
      },
      headers: { 'Authorization': token }
    }, (err, res, body) => {
      if (err) {                              // If internal error making HTTP request...
        console.log("Internal Error getting meta for content-id: %s - ", cid, err);
        reject(err);                          // Return error.
      } else if (res.statusCode >= 400) {     // If API returns non-success status code...
        console.log("API returned a %d error status while getting meta for content-id: %s - ", res.statusCode, cid, body);
        reject(res);                          // Return response info.
      } else {                                // Else request OK, parse metadata...
        try {                                 // Attempt to parse metadata from JSON...
          const meta = JSON.parse(body).records[0]
        } catch (e) {
          console.log("Error parsing metadata from JSON for %s - ", site, e);
          reject(res);                        // Return response info. 
        }
        resolve(meta);                        // Return the metadata!
      }
    });
  });
}

/** 
 * GETS VL API authorization token for a specified site.
 * Helper for getContentMeta().
 * @param site <string> - The site requesting the token.
 * @return <string>     - The site API authorization token.
 */
function _getAuthorizationToken(site) {
  return new Promise((resolve, reject) => {
    Request({
      url: 'https://' + Config.stage + '-api.viewlift.com/identity/anonymous-token',
      method: 'GET',
      qs: { site: site }
    }, (err, res, body) => {
      if (err) {                              // If internal error making HTTP request...
        console.log("Internal Error getting API token for %s - ", site, err);
        reject(err);                          // Return error.
      } else if (res.statusCode >= 400) {     // If API returns non-success status code...
        console.log("API returned a %d error status while getting token for %s - ", res.statusCode, site, body);
        reject(res);                          // Return response info.
      } else {                                // Else request OK, parse auth token...
        try {                                 // Attempt to parse auth token from JSON...
          const token = JSON.parse(body).authorizationToken;
        } catch (e) {
          console.log("Error parsing auth token from JSON for %s - ", site, e);
          reject(res);                        // Error - Return response info. 
        }
        resolve(token);                       // Return the Auth Token!
      }
    });
  });
}

//** Lambda Entry Point - Execution Begins Here **//
exports.handler = function(event, context, callback) {
  // Iterate through DynamoDB Events...
  event.Records.forEach(record => {
    // Determine & Handle Event Type (INSERT/MODIFY/DELETE)
    switch (record.eventName) {
      case 'INSERT':
        // We do not currently index on INSERT events - 2/13/18
        //insertDocument(null, record);
        break;
      case 'MODIFY':
        modifyDocument(null, record);
        break;
      case 'REMOVE':
        removeDocument(null, record);
        break;
    }
  });
}




