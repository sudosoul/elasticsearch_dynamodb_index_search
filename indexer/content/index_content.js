/**
 * DynamoDB to ElasticSearch Indexing Service for Content.
 *
 * This service is attached as a trigger to the following DynamoDB table: PROD.CONTENT.CONTENT_METADATA.
 * Whenever a change is made to the table (INSERT, REMOVE, MODIFY), this service is triggered and
 * receives the updated data. This service will parse the required data, and update the ElasticSearch
 * index accordingly. 
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.01.00
 */

// Load Dependencies:
const AWS = require('aws-sdk');       // AWS SDK
const ES  = require('elasticsearch'); // ElasticSearch Client
const Request = require('request');   // HTTP Request Library
const Config  = require('./config');  // Local Config

/**
 * Process MODIFY events from DynamoDB.
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 */
function modifyDocument(es, record) {

}

/**
 * Process INSERT events from DynamoDB.
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 */
function insertDocument(es, record) {

}

/**
 * Process REMOVE events from DynamoDB.
 * @param es <mixed>     - ElasticSearch Client Object.
 * @param record <mixed> - DynamoDB Record.
 */
function removeDocument(es, record) {

}

/**
 * Parses the indexable data fields from the content
 * metadata & returns a single object ready for ES indexing. 
 * Called during INSERT & MODIFY events.
 * @param data <mixed> - The data being parsed.
 * @return <mixed>     - The ES-upload-ready object.
 */
function prepareIndexBody(data) {

}

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
        } catch (e => {
          console.log("Error parsing metadata from JSON for %s - ", site, e);
          reject(res);                        // Return response info. 
        });
        resolve(meta);                       // Return the metadata!
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
        } catch (e => {
          console.log("Error parsing auth token from JSON for %s - ", site, e);
          reject(res);                        // Error - Return response info. 
        });
        resolve(token);                       // Return the Auth Token!
      }
    });
  });
}





































