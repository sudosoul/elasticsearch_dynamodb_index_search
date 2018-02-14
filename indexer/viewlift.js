/**
 * ViewLift API Library
 * Contains functions to perform common operations with the ViewLift API.
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 1.0.0
 */

// Load Dependencies:
const Request = require('request');

class ViewLift {

  /**
   * Constructor
   * @param stage <string>    - The stage of the API to use - develop || prod.
   * @param identity <string> - The identity to use for API requests - anonymous || server.
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
   * GETS video metadata from VL API for specified video ID.
   * @param site  <string> - The site hosting the content.
   * @param id   <string>  - The video ID to retrieve metadata for.
   * @return      <mixed>  - Object containing the video metadata.
   */
  getVideo(site, id) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (!self.token) {
        self.generateToken(site)              // Generate API token if one not set.
          .then((token) => {
            self.token = token;               // Set token for this instance.
            self._getVideo(site, id)          // Make the Get Video request.
              .then(meta => {
                resolve(meta);                // Return the video metadata.
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
            resolve(meta);                    // Return the video metadata.
        }).catch(e => {
          console.log("Error getting video metadata from API - ", e);
          reject(e);                          // Error getting metadata, return error.
        });
      }
    });
  }



  /**
   * GETS video metadata from VL API for specified video ID.
   * Helper for getVideo().
   * @param site  <string> - The site hosting the content.
   * @param id    <string> - The video ID to retrieve metadata for.
   * @return      <mixed>  - Object containing the video metadata.
   */
  _getVideo(site, id) {
    const self = this;
    return new Promise((resolve, reject) => {
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
            resolve(meta);                      // Return the metadata!
          } catch (e) {
            console.log("Error parsing metadata from JSON for video %s - ", site, e);
            reject(res);                        // Return response info. 
          }
        }
      });
    });
  }

  /** 
   * GETS API authorization token for a specified site by identity type.
   * @param site <string> - The site requesting the token.
   * @return Promise      - The site API authorization token, reject with error.
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
   * GETS anonymous API authorization token for a specified site.
   * @param site <string> - The site requesting the token.
   * @return Promise      - The site API authorization token, reject with error.
   */
  _getAnonymousToken(site) {
    const self = this;
    return new Promise((resolve, reject) => {
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
            resolve(token);                     // Return the Auth Token!
          } catch (e) {
            console.log("Error parsing auth token from JSON for %s - ", site, e);
            reject(res);                        // Error - Return response info. 
          }
        }
      });
    });
  }

  /** 
   * GETS server API authorization token for a specified site.
   * @param site <string> - The site requesting the token.
   * @return Promise      - The site API authorization token, reject with error.
   */
  _getServerToken(site) {
    const self = this;
    return new Promise((resolve, reject) => {
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
            resolve(token);                     // Return the Auth Token!
          } catch (e) {
            console.log("Error parsing auth token from JSON for %s - ", site, e);
            reject(res);                        // Error - Return response info. 
          }
        }
      });
    });
  }

}


module.exports = ViewLift;


