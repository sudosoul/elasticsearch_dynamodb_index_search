/**
 * ViewLift API Library
 * Contains functions to perform common operations with the ViewLift API.
 *
 * @requires request
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 1.0.0
 */

// Load Dependencies:
const Request = require('request');

class ViewLift {

  /**
   * Constructor
   *
   * @param {string} stage    - The stage of the API to use: develop || prod.
   * @param {string} identity - The identity to use for API requests: anonymous || server.
   */
  constructor(stage, identity) {
    // Set the development stage:
    if (!stage) {
      console.log('Stage not set in api');
      throw 'Stage not set!';
    } else if (stage !== 'develop' && stage !== 'release' && stage !== 'prod') {
      console.log('Invalid value for stage in api');
      throw 'Invalid value for stage. Acceptable values are develop or prod.';
    } else {
      this.stage = stage;
    }
    // Set the identity:
    if (!identity) {
      console.log('Identity not set in api');
      throw 'Identity not set!';
    } else if (identity !== 'anonymous' && identity !== 'anon' && identity !== 'server') {
      console.log('invalid identity set in api');
      throw 'Invalid value for identity. Acceptable values are anonymous, anon, or server.';
    } else {
      this.identity = identity;
    }
  }

  /**
   * Gets video metadata from VL API for specified video ID.
   *
   * @param    {string} site - The site hosting the content.
   * @param    {string} id   - The video ID to retrieve metadata for.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        The video metadata.
   * @rejects  {RequestError}  Error making request to VL API.
   */
  getVideo(site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {
      self.generateToken(site)              // Generate API token 
        .then((token) => {
          self._getVideo(site, id, token)   // Make the Get Video request.
            .then(meta => {
              fulfill(meta);                // Return the video metadata.
          }).catch(e => {
            console.log("Error getting video metadata from API - ", e);
            reject(e);                      // Error getting metadata, return error.
          });
      }).catch(e => {
        console.log("Error getting API token for site %s - ", site, e);
        reject(e);                          // Error getting VL API token, return error.
      });
    });
  }

  /**
   * Gets video data from VL API for specified video ID.
   * Helper for getVideo().
   *
   * @param    {string} site  - The site the video belongs to
   * @param    {string} id    - The video ID to retrieve data for.
   * @param    {string} token - The ViewLift API token.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        Object containing the video data.
   * @rejects  {RequestError}  Error making request to API.
   * @rejects  {ParseError}    Error parsing the JSON API response.
   */
  _getVideo(site, id, token) {
    const self = this;
    return new Promise((fulfill, reject) => {
      Request({
        url: 'https://' + self.stage + '-api.viewlift.com/content/videos',
        method: 'GET',
        qs: { 
          site: site, 
          ids:  id
        },
        headers: { 'Authorization': token }
      }, (err, res, body) => {
        if (err) {                              // If internal error making HTTP request...
          console.log("Internal Error getting data for video: %s - ", id, err);
          reject(err);                          // Return error.
        } else if (res.statusCode >= 400) {     // If API returns non-success status code...
          console.log("API returned a %d error status while getting data for video: %s - ", res.statusCode, id, body);
          reject(res);                          // Return response info.
        } else {                                // Else request OK, parse metadata...
          try {                                 // Attempt to parse metadata from JSON...
            const meta = JSON.parse(body).records[0];
            fulfill(meta);                      // Return the metadata!
          } catch (e) {
            console.log("Error parsing data from JSON for video %s - ", id, e);
            reject(body);                        // Return response info. 
          }
        }
      });
    });
  }

  /**
   * Gets article data from VL API for specified article ID.
   *
   * @param    {string} site - The site the article belongs to
   * @param    {string} id   - The article ID to retrieve data for.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        The article data.
   * @rejects  {RequestError}  Error making request to VL API.
   */
  getArticle(site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {
      self.generateToken(site)              // Generate API token 
        .then((token) => {
          self._getArticle(site, id, token)   // Make the Get Article request.
            .then(meta => {
              fulfill(meta);                // Return the article data.
          }).catch(e => {
            console.log("Error getting article data from API - ", e);
            reject(e);                      // Error getting data, return error.
          });
      }).catch(e => {
        console.log("Error getting API token for site %s - ", site, e);
        reject(e);                          // Error getting VL API token, return error.
      });
    });
  }

  /**
   * Gets article data from VL API for specified article ID.
   * Helper for getArticle().
   *
   * @param    {string} site  - The site the article belongs to
   * @param    {string} id    - The article ID to retrieve metadata for.
   * @param    {string} token - The ViewLift API token.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        Object containing the article data.
   * @rejects  {RequestError}  Error making request to API.
   * @rejects  {ParseError}    Error parsing the JSON API response.
   */
  _getArticle(site, id, token) {
    const self = this;
    return new Promise((fulfill, reject) => {
      Request({
        url: 'https://' + self.stage + '-api.viewlift.com/content/article',
        method: 'GET',
        qs: { 
          id:   id,
          site: site, 
        },
        headers: { 'Authorization': token }
      }, (err, res, body) => {
        if (err) {                              // If internal error making HTTP request...
          console.log("Internal Error getting data for article: %s - ", id, err);
          reject(err);                          // Return error.
        } else if (res.statusCode >= 400) {     // If API returns non-success status code...
          console.log("API returned a %d error status while getting data for article: %s - ", res.statusCode, id, body);
          reject(res);                          // Return response info.
        } else {                                // Else request OK, parse data...
          try {                                 // Attempt to parse data from JSON...
            const data = JSON.parse(body);
            fulfill(data);                      // Return the data!
          } catch (e) {
            console.log("Error parsing data from JSON for article %s - ", id, e);
            reject(body);                        // Return response info. 
          }
        }
      });
    });
  }

  /**
   * Gets event data from VL API for specified article ID.
   *
   * @param    {string} site - The site the event belongs to
   * @param    {string} id   - The event ID to retrieve data for.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        The event data.
   * @rejects  {RequestError}  Error making request to VL API.
   */
  getEvent(site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {
      self.generateToken(site)              // Generate API token 
        .then((token) => {
          self._getEvent(site, id, token)   // Make the Get Event request.
            .then(meta => {
              fulfill(meta);                // Return the event data.
          }).catch(e => {
            console.log("Error getting article data from API - ", e);
            reject(e);                      // Error getting data, return error.
          });
      }).catch(e => {
        console.log("Error getting API token for site %s - ", site, e);
        reject(e);                          // Error getting VL API token, return error.
      });
    });
  }

  /**
   * Gets event data from VL API for specified article ID.
   * Helper for getEvent().
   *
   * @param    {string} site  - The site the event belongs to
   * @param    {string} id    - The event ID to retrieve metadata for.
   * @param    {string} token - The ViewLift API token.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        Object containing the event data.
   * @rejects  {RequestError}  Error making request to API.
   * @rejects  {ParseError}    Error parsing the JSON API response.
   */
  _getEvent(site, id, token) {
    const self = this;
    return new Promise((fulfill, reject) => {
      Request({
        url: 'https://' + self.stage + '-api.viewlift.com/content/event',
        method: 'GET',
        qs: { 
          id:   id,
          site: site, 
        },
        headers: { 'Authorization': token }
      }, (err, res, body) => {
        if (err) {                              // If internal error making HTTP request...
          console.log("Internal Error getting data for event: %s - ", id, err);
          reject(err);                          // Return error.
        } else if (res.statusCode >= 400) {     // If API returns non-success status code...
          console.log("API returned a %d error status while getting data for event: %s - ", res.statusCode, id, body);
          reject(res);                          // Return response info.
        } else {                                // Else request OK, parse data...
          try {                                 // Attempt to parse data from JSON...
            const data = JSON.parse(body);
            fulfill(data);                      // Return the data!
          } catch (e) {
            console.log("Error parsing data from JSON for event %s - ", id, e);
            reject(body);                        // Return response info. 
          }
        }
      });
    });
  }

  /** 
   * Gets a API authorization token for a specified site by identity type.
   *
   * @param    {string} site - The site requesting the token.
   * @return   {Promise.<string,Error>} 
   * @fulfills {string}        The API authorization token.
   * @rejects  {RequestError}  Error with API request.
   * @rejects  {ParseError}    Error parsing the API JSON response.
   */
  generateToken(site) {
    if (!site) throw 'Site not defined.';
    switch (this.identity) {
      case 'anonymous':
        return this._getAnonymousToken(site);
      case 'anon':
        return this._getAnonymousToken(site);
      case 'server':
        return this._getServerToken(site);
      default:
        return this._getAnonymousToken(site);
    }
  }

  /** 
   * Gets anonymous API authorization token for a specified site.
   * Helper for getAnonymousToken()
   *
   * @param    {string} site - The site requesting the token.
   * @return   {Promise.<string,Error>} 
   * @fulfills {string}        The anonymous API authorization token.
   * @rejects  {RequestError}  Error with API request.
   * @rejects  {ParseError}    Error parsing the API JSON response.
   */
  _getAnonymousToken(site) {
    const self = this;
    return new Promise((fulfill, reject) => {
      Request({
        url: 'https://' + self.stage + '-api.viewlift.com/identity/anonymous-token',
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
            fulfill(token);                     // Return the Auth Token!
          } catch (e) {
            console.log("Error parsing auth token from JSON for %s - ", site, e);
            reject(res);                        // Error - Return response info. 
          }
        }
      });
    });
  }

  /** 
   * Gets a server API authorization token for a specified site.
   *
   * @param    {string} site  - The site requesting the token.
   * @return   {Promise.<string,Error>} 
   * @fulfills {string}         The server API authorization token.
   * @rejects  {RequestError}   Error with API request.
   * @rejects  {ParseError}     Error parsing the API JSON response.
   */
  _getServerToken(site) {
    const self = this;
    return new Promise((fulfill, reject) => {
      Request({
        url: 'https://' + self.stage + '-api.viewlift.com/identity/server-token',
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
            fulfill(token);                     // Return the Auth Token!
          } catch (e) {
            console.log("Error parsing auth token from JSON for %s - ", site, e);
            reject(res);                        // Error - Return response info. 
          }
        }
      });
    });
  }

}

//** Expose this ViewLift Class **//
module.exports = ViewLift;


