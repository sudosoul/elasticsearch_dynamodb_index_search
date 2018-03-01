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
      throw 'Stage not set!';
    } else if (stage !== 'develop' && stage !== 'prod') {
      throw 'Invalid value for stage. Acceptable values are develop or prod.';
    } else {
      this.stage = stage;
    }
    // Set the identity:
    if (!identity) {
      throw 'Identity not set!';
    } else if (identity !== 'anonymous' && identity !== 'anon' && identity !== 'server') {
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
      if (!self.token) {
        self.generateToken(site)              // Generate API token if one not set.
          .then((token) => {
            setToken(token);               // Set token for this instance.
            self._getVideo(site, id)          // Make the Get Video request.
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
      } else {
        self._getVideo(site, id)              // Make the Get Video request.
          .then(meta => {
            fulfill(meta);                    // Return the video metadata.
        }).catch(e => {
          console.log("Error getting video metadata from API - ", e);
          reject(e);                          // Error getting metadata, return error.
        });
      }
    });
  }

  setToken(token) {
    this.token = token;
  }



  /**
   * Gets video metadata from VL API for specified video ID.
   * Helper for getVideo().
   *
   * @param    {string} site - The site hosting the content.
   * @param    {string} id   - The video ID to retrieve metadata for.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}        Object containing the video metadata.
   * @rejects  {RequestError}  Error making request to API.
   * @rejects  {ParseError}    Error parsing the JSON API response.
   */
  _getVideo(site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {
      Request({
        url: 'https://' + self.stage + '-api.viewlift.com/content/videos',
        method: 'GET',
        qs: { 
          site: site, 
          ids:  id
        },
        headers: { 'Authorization': self.token }
      }, (err, res, body) => {
        if (err) {                              // If internal error making HTTP request...
          console.log("Internal Error getting meta for video: %s - ", id, err);
          reject(err);                          // Return error.
        } else if (res.statusCode >= 400) {     // If API returns non-success status code...
          console.log("API returned a %d error status while getting meta for video: %s - ", res.statusCode, id, body);
          reject(res);                          // Return response info.
        } else {                                // Else request OK, parse metadata...
          try {                                 // Attempt to parse metadata from JSON...
            const meta = JSON.parse(body).records[0]
            fulfill(meta);                      // Return the metadata!
          } catch (e) {
            console.log("Error parsing metadata from JSON for video %s - ", site, e);
            reject(res);                        // Return response info. 
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
        break;
      case 'anon':
        return this._getAnonymousToken(site);
        break;
      case 'server':
        return this._getServerToken(site);
        break;
      default:
        return this._getAnonymousToken(site);
        break;
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


