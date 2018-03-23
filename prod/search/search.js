/**
 * ElasticSearch Search Service
 * Contains functions to perform common search queries in ElasticSearch.
 *
 * @requires elasticsearch
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 1.0.0
 */
// Import Dependencies:
const ES = require('elasticsearch');

class Search {

  /**
   * Constructor
   *
   * @param {string} endpoint - The ElasticSearch host URL/Endpoint.
   * @param {string} version  - The ES API Version to use.
   * @param {string} index    - The ES index to search.
   */
  constructor(endpoint, version, index) {
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
    // Set ES Index to Search:
    if (!index) {
      throw 'Index not provided.';
    } else {
      this.index = index;
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
   * Suggests videos based on the search term / prefix
   * This is used as the autosuggest videos on sites.
   *
   * Example: If a user searches inputs 'b' on the search input, this function would be
   * called and will search for all videos whose specified fields begin with 'b'.
   * The search fields are specified in the query below in `multi_match` - `fields`.
   * The `fields` property contains an array of all the fields we wish to search against. 
   * Appending ^{number} indicates a higher priority/score boost for that field. 
   *
   * For example: ['title^3', 'category^2', 'someOtherField'] would indicate that matches found under the
   * `title` field are 3 (THREE) times more relevant than matches found in the other fields. 
   * Matches found for `category` are 2 (TWO) times more relevant than matches found in other fields (except title). 
   * Therefore the search results would show `title` matches with the highest scores, `category` matches with the 2nd
   * highest score, and `someOtherField` with the lowest matching scores. 
   *
   * NOTE: The search query itself is legacy code that cannot at this time be modified.
   * For this reason, fields have be indexed with the nGram analyzer, to support the
   * legacy setup of performing a multi_match from the search prefix, to the specified fields.
   *
   * The more correct way to implement this would be to query the _suggest URI of ES. 
   *
   * @param {string} searchTerm    - The search term / search-prefix to search for videos by.
   * @param {boolean} showTrailers - Whether or not to include trailers in the search results. 
   * @return {Promise.<object,Error>}
   * @fulfills {array} On successful search, returns an array of items that matched the searchTerm.
   * @rejects {Error}  Rejects if error performing the search query (NOT IF NO RESULTS FOUND).
   */ 
  suggestVideos(searchTerm, showTrailers) {
    const self = this;
    return this.es.search({
      index: self.index,
      size: 18,
      type: 'videos',
      body: {
        query: {
          multi_match: {
            query: searchTerm,
            type: 'best_fields',
            analyzer: 'nGram_analyzer',
            fields: ['title^3', 'primaryCategory^2', 'categories.name', 'people.name', 'tags.name']
          } 
        }
      }
    });
  }

}

// Expose this Class
module.exports = Search;

