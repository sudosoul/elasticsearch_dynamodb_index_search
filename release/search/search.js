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
      keepAlive:    false  // DO NOT CHANGE - LIBRARY CRASHES WITHOUT THIS SET TO FALSE @see https://github.com/elastic/elasticsearch-js/issues/521 
    }); 
  }

  /**
   * Gets suggestions for content types specified by `types, by performing individual search queries
   * on each relevant content type (videos, series, audio, events, articles, photos).
   *
   * @param    {string} searchTerm      - The search term / search prefix to search by.
   * @param    {string} types           - Comma separatted list of types, blank for all.
   * @param    {number} offset          - Pagination offset, or the initial # of records to skip.
   * @param    {number} limit           - Pagination limit, the # of records to return.
   * @return   {Promise.<array,Error>}  - Promise          
   * @fulfills {array}                  - Array containing all the search results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  getSuggestions(searchTerm, types, offset, limit) {
    const self = this;
    if (!offset) offset = 0;   // Offset default to 0 if not defined.
    if (!limit)  limit  = 100; // Limit default to 100 if not defined.
    return new Promise((fulfill, reject) => {
      const suggestions = [];     // Hold each query results
      const response    = [];     // Hold the combined/formatted search response
      //** Perform search based on type(s) defined **//
      if (types) { 
        types = types.split(',');
        types.forEach(type => {
          switch (type) {
            case 'videos':
              suggestions.push(self._getVideoSuggestions(searchTerm, offset, limit));     // Query Videos
              break;
            case 'series':
              suggestions.push(self._getSeriesSuggestions(searchTerm, offset, limit));    // Query Series
              break;
            case 'articles':
              suggestions.push(self._getArticleSuggestions(searchTerm, offset, limit));   // Query Articles
              break;
            case 'events':
              suggestions.push(self._getEventSuggestions(searchTerm, offset, limit));     // Query Events
              break;
            case 'audio':
              suggestions.push(self._getAudioSuggestions(searchTerm, offset, limit));     // Query Audio
              break;
            case 'photos':
              suggestions.push(self._getPhotoSuggestions(searchTerm, offset, limit));     // Query Photos
              break;
          }
        });
      } else {
        //** No type(s) defined, search all types **//   
        suggestions.push(self._getVideoSuggestions(searchTerm, offset, limit));     // Query Videos
        suggestions.push(self._getSeriesSuggestions(searchTerm, offset, limit));    // Query Series
        suggestions.push(self._getArticleSuggestions(searchTerm, offset, limit));   // Query Articles
        suggestions.push(self._getEventSuggestions(searchTerm, offset, limit));     // Query Events
        suggestions.push(self._getAudioSuggestions(searchTerm, offset, limit));     // Query Audio
        suggestions.push(self._getPhotoSuggestions(searchTerm, offset, limit));     // Query Photos
      }
      //** Return combined results **//
      Promise.all(suggestions)
        .then(results => {
          results.forEach(result => {
            //** If query contains results, push it to final response array **//
            if (result.hits.hits.length > 0) {
              result.hits.hits.forEach(hit => {
                response.push(hit._source.data);
              });
            }
          });
          fulfill(response); // Return combined search results!
      }).catch(e => {
        console.log('Error performing search query - ', e);
        reject(e);
      });
    });
  }

  /**
   * Searches for videos that match the searchTerm
   *
   * @param    {string} searchTerm      - The search term / search-prefix to search for videos by.
   * @return   {Promise.<array,Error>}  - Promise
   * @fulfills {array}                  - Search Results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  _getVideoSuggestions(searchTerm, offset, limit) {
    const self = this;
    return this.es.search({
      index: self.index,
      from: offset,
      size: limit,
      type: 'content',
      body: {
        query: {
          multi_match: {
            query    : searchTerm,
            type     : 'phrase',
            fields   : ['videoTitle', 'videoPrimaryCategory', 'videoCategories.name', 'videoPeople.name', 'videoTags.name']
          }
        },
        sort: [
          {'year': 'desc'}
        ]
      }
    });
  }

  /**
   * Searches for series that match the searchTerm
   *
   * @param    {string} searchTerm      - The search term / search-prefix to search for series by.
   * @return   {Promise.<array,Error>}  - Promise
   * @fulfills {array}                  - Search Results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  _getSeriesSuggestions(searchTerm, offset, limit) {
    const self = this;
    return this.es.search({
      index: self.index,
      from: offset,
      size: limit,
      type: 'content',
      body: {
        query: {
          multi_match: {
            query    : searchTerm,
            type     : 'phrase',
            fields   : ['seriesTitle', 'seriesPrimaryCategory', 'seriesCategories.name', 'seriesPeople.name', 'seriesTags.name']
          }
        },
        sort: [
          {'year': 'desc'}
        ]
      }
    });
  }

  /**
   * Searches for articles that match the searchTerm
   *
   * @param    {string} searchTerm      - The search term / search-prefix to search for articles by.
   * @return   {Promise.<array,Error>}  - Promise
   * @fulfills {array}                  - Search Results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  _getArticleSuggestions(searchTerm, offset, limit) {
    const self = this;
    return this.es.search({
      index: self.index,
      from: offset,
      size: limit,
      type: 'content',
      body: {
        query: {
          multi_match: {
            query    : searchTerm,
            type     : 'phrase',
            fields   : ['articleTitle', 'articleAuthor', 'articlePrimaryCategory', 'articleCategories.name', 'articleTags.name']
          }
        },
        sort: [
          {'year': 'desc'}
        ]
      }
    });
  }

  /**
   * Searches for events that match the searchTerm
   *
   * @param    {string} searchTerm      - The search term / search-prefix to search for events by.
   * @return   {Promise.<array,Error>}  - Promise
   * @fulfills {array}                  - Search Results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  _getEventSuggestions(searchTerm, offset, limit) {
    const self = this;
    return this.es.search({
      index: self.index,
      from: offset,
      size: limit,
      type: 'content',
      body: {
        query: {
          multi_match: {
            query    : searchTerm,
            type     : 'phrase',
            fields   : ['eventTitle', 'eventPrimaryCategory', 'eventCategories.name', 'eventTags.name']
          }
        },
        sort: [
          {'year': 'desc'}
        ]
      }
    });
  }

  /**
   * Searches for audio that match the searchTerm
   *
   * @param    {string} searchTerm      - The search term / search-prefix to search for audio by.
   * @return   {Promise.<array,Error>}  - Promise
   * @fulfills {array}                  - Search Results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  _getAudioSuggestions(searchTerm, offset, limit) {
    const self = this;
    return this.es.search({
      index: self.index,
      from: offset,
      size: limit,
      type: 'content',
      body: {
        query: {
          multi_match: {
            query    : searchTerm,
            type     : 'phrase',
            fields   : ['audioTitle', 'audioAuthor', 'audioPrimaryCategory', 'audioCategories.name', 'audioTags.name']
          }
        },
        sort: [
          {'year': 'desc'}
        ]
      }
    });
  }

  /**
   * Searches for photos that match the searchTerm
   *
   * @param    {string} searchTerm      - The search term / search-prefix to search for photos by.
   * @return   {Promise.<array,Error>}  - Promise
   * @fulfills {array}                  - Search Results
   * @rejects  {Error}                  - An ElasticSearch Error
   */
  _getPhotoSuggestions(searchTerm, offset, limit) {
    const self = this;
    return this.es.search({
      index: self.index,
      from: offset,
      size: limit,
      type: 'content',
      body: {
        query: {
          multi_match: {
            query    : searchTerm,
            type     : 'phrase',
            fields   : ['photoTitle', 'photoAuthor', 'photoPrimaryCategory', 'photoCategories.name', 'photoTags.name']
          }
        },
        sort: [
          {'year': 'desc'}
        ]
      }
    });
  }

}

// Expose this Search Class
module.exports = Search;

