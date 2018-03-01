/**
 * Indexes Videos
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION  - The AWS Region, available by default by Lambda.
 *  STAGE       - The development stage (dev, staging, prod).
 *  ES_ENDPOINT - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION  - The version of ElasticSearch used on our cluster.
 *  ES_SUGGEST_SKIP - Comma separated string including the words to skip (a,the,of,in).
 *  
 *
 * @requires api.js
 * @requires index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const API   = require('../shared/api'); // Import ViewLift API Class
const Index = require('../shared/index'); // Import the parent Index class



/**
 * Performs indexing operations for video documents.
 * This class is called to either insert or remove a document from a given index.
 *
 * Insert: Retrieves video data from API, formats the data to the document model,
 * and inserts it into the relevant index. 
 *
 * Remove: Removes a document from an index specified by document ID.
 *
 */
class Videos extends Index {

  /**
   * Constructor
   */
  constructor() {
    this.api = new API(process.env.STAGE, 'server');
  }

  /**
   * Removes or Inserts a video document into an index specified by site.
   *
   * @param    {string} action - `insert` | `remove` - insert or remove the doc.
   * @param    {string} site   - The site the video belongs to, also the name of the index.
   * @param    {string} id     - The ID of the video to insert, or the ID of the document to remove.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean} - True on success
   * @rejects  {Error}   - Error on fail
   */
  index(action, index, id) {
    const self = this;
    return new Promise((fulfill, reject) => {     
      //** Insert/Modify Document **//
      if (action === 'INSERT') {
        self._prepareDocument(site, id)           // Create the video document to insert..
          .then(doc => {
            self.insert(site, 'videos', id, doc)  // Insert the document..
              .then(success => {
                fulfill(true);                    // Document successfully inserted!
            }).catch(e => {
              reject(e);                          // Error inserting document!
            });
        }).catch(e => {
          reject(e);                              // Error preparing document!
        })      
      //** Remove Document **//
      } else if (action === 'remove') {
        self.remove(site, 'videos', id, doc)      // Remove the document
          .then(success => {
            fulfill(true);                        // Document successfully inserted!
        }).catch(e => {
          reject(e);                              // Error removing document!
        });
      }
    });
  }

  /**
   * Prepare the video document for indexing, with data retrieve from VL API.
   * 
   * @param    {string} site - The site associated with the video.
   * @param    {string} id   - The video ID.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}          The document body object.
   * @rejects  {Error}           A VL API Error.
   */   
  _prepareDocument(site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {
      // Get Complete Video Data from API:
      self.api.getVideo(site, id)
        .then(video => {
          // Define & Build Document Body:
          const doc = {
            title:           video.gist.title,
            suggestTitle:    self._defineTitleSuggestions(video.gist.title),
            type:            'video',
            description:     video.gist.description,
            primaryCategory: video.gist.primaryCategory ? video.gist.primaryCategory.title : null,
            categories:      self._defineCategories(video.categories),
            tags:            self._defineTags(video.tags),
            status:          video.contentDetails.status,
            people:          video.creditBlocks ? self._definePeople(video.creditBlocks) : null,
            isTrailer:       video.gist.isTrailer || false,
            free:            video.gist.free,
            year:            video.gist.year,
            parentalRating:  video.parentalRating,
            data:            video
          };
          // Fulfill with video document:
          fulfill(doc);
      }).catch(e => {
        reject(e);
      });
    });
  }

  /**
   * Defines an array of suggestions for a video title.
   *
   * Example:
   *  If the title is "Welcome to the Black Parade", we will generate
   *  the following combinations/suggestions...
   *    "Welcome to the Black Parade"
   *    "Black Parade"
   *    "Parade"
   *
   * Note:
   *  We skip common words, and these common words will also be excluded
   *  when the search is performed on the client-side EXCEPT if the
   *  common word is the first word in the search phrase. 
   *  Example: If user searches for 'the' - we will only return titles that begin with 'the'.
   *
   * Explanation...
   *  We define multiple phrases for suggestions to cover all search cases
   *    Input: "Welcome"   // Request: "welcome" // Response: "Welcome to the Black Parade"
   *    Input: "the black" // Request: "black"   // Response: "Welcome to the Black Parade"
   *    Input: "parade"    // Request: "parade"  // Response: "Welcome to the Black Parade"
   *
   * @param  {string} title - The full movie title.
   * @return {array} Array holding the combination of suggestion phrases.
   */
  _defineTitleSuggestions(title) {
    const suggestions = [];                               // Array to hold all suggestions
    const skip  =  process.env.ES_SUGGEST_SKIP.split(',') // The skip words 
    const words = title.split(' ');   // Split/explode title into array of each word in title ['The', 'Movie', 'Title']
    // Iterate through each word, starting with 2nd word...
    for (let x=1; x<words.length; x++) {
      let word = words[x];
      // If the word not found in skip word array list...
      if (skip.indexOf(word) === -1) {
        // Iterate through the rest of the words to construct the phrase...
        let phrase = word;
        for (let y=x+1; y<words.length; y++) {
          phrase = phrase +' ' +words[y]; 
        }
        suggestions.push(phrase); // Push full phrase to array
      }
    }
    suggestions.push(title);  // Push the full/original title
    return suggestions;
  }

  /**
   * Parses the `creditBlocks` field returned from API and
   * prepares an array of objects containing the name of each
   * actor and directors found in the `creditBlocks`.
   *
   * @param  {array} creditBlocks - The creditBlocks array returned from API.
   * @return {array} Array of objects containing name of each actor/director.
   */
  _definePeople(creditBlocks) {
    const people = [];
    creditBlocks.forEach(block => {
      block.credits.forEach(credit => {
        people.push({name: credit.title});
      });
    });
    return people;
  }

  /**
   * Parses the `categories` field returned from API and
   * prepares an array of objects containing the name of each category.
   *
   * @param  {array} categories - The categories array returned from API.
   * @return {array} Array of objects containing name of each category.
   */
  _defineCategories(categories) {
    const _categories = [];
    categories.forEach(category => {
      _categories.push({name: category.title});
    });
    return _categories;
  }

  /**
   * Parses the `tags` field returned from API and
   * prepares an array of objects containing the name of each tag.
   *
   * @param  {array} tags - The tags array returned from API.
   * @return {array} Array of objects containing name of each tag.
   */
  _defineTags(tags) {
    const _tags = [];
    tags.forEach(tag => {
      _tags.push({name: tag.title});
    });
    return _tags;
  }

}

//** Expose this Videos Class **//
module.exports = Videos;
