/**
 * Indexes Photos in PHOTOGALLERY
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION  - The AWS Region, available by default by Lambda.
 *  STAGE       - The development stage (dev, staging, prod).
 *  ES_ENDPOINT - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION  - The version of ElasticSearch used on our cluster.
 *  
 *
 * @requires api.js
 * @requires index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const API   = require('../shared/api');   // Import ViewLift API Class
const Index = require('../shared/index'); // Import the parent Index class

/**
 * Performs indexing operations for photo documents.
 * This class is called to either insert or remove a document from a given index.
 *
 * Insert: Retrieves photo data from API, formats the data to the document model,
 * and inserts it into the relevant index. 
 *
 * Remove: Removes a document from an index specified by document ID.
 *
 */
class Photos extends Index {

  /**
   * Constructor
   */
  constructor() {
    super(process.env.ES_ENDPOINT, process.env.ES_VERSION);
    this.api = new API(process.env.STAGE, 'anonymous');
  }

  /**
   * Removes or Inserts an photo document into an index specified by site.
   *
   * @param    {string} action - `insert` | `remove` - insert or remove the doc.
   * @param    {string} site   - The site the photo belongs to, also the name of the index.
   * @param    {string} id     - The ID of the photo to insert, or the ID of the document to remove.
   * @return   {Promise.<boolean,Error>}
   * @fulfills {boolean} - True on success
   * @rejects  {Error}   - Error on fail
   */
  index(action, site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {     
      //** Insert/Modify Document **//
      if (action === 'INSERT') {
        self._prepareDocument(site, id)             // Create the photo document to insert..
          .then(doc => {
            self.insert(site, id, doc)  // Insert the document..
              .then(success => {
                fulfill(true);                      // Document successfully inserted!
            }).catch(e => {
              reject(e);                            // Error inserting document!
            });
        }).catch(e => {
          reject(e);                                // Error preparing document!
        });      
      //** Remove Document **//
      } else if (action === 'REMOVE') {
        self.remove(site, id)           // Remove the document
          .then(success => {
            fulfill(true);                          // Document successfully removed!
        }).catch(e => {
          reject(e);                                // Error removing document!
        });
      }
    });
  }

  /**
   * Prepare the photo document for indexing, with data retrieve from VL API.
   * 
   * @param    {string} site - The site associated with the photo.
   * @param    {string} id   - The photo ID.
   * @return   {Promise.<object,Error>} 
   * @fulfills {object}          The document body object.
   * @rejects  {Error}           A VL API Error.
   */   
  _prepareDocument(site, id) {
    const self = this;
    return new Promise((fulfill, reject) => {
      // Get photo Data from API:
      self.api.getPhoto(site, id)
        .then(photo => {
          // Define & Build Document Body:
          const doc = {
            type                 : 'photo',
            photoTitle           : photo.gist.title,
            photoDescription     : photo.gist.description,
            photoAuthor          : photo.contentDetails.author ? (Object.keys(photo.contentDetails.author).length !== 0 ? photo.contentDetails.author.name : null) : null,
            photoPrimaryCategory : photo.gist.primaryCategory ? (Object.keys(photo.gist.primaryCategory).length !== 0 ? photo.gist.primaryCategory.title : null) : null,
            photoCategories      : photo.categories ? (photo.categories.length > 0 ? self._defineCategories(photo.categories) : null) : null,
            photoTags            : photo.tags ? (photo.tags.length > 0 ? self._defineTags(photo.tags) : null) : null,
            publishedDate        : photo.gist.publishedDate,
            data                 : photo
          };
          // Fulfill with photo document:
          fulfill(doc);
      }).catch(e => {
        reject(e);
      });
    });
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

//** Expose this Photos Class **//
module.exports = Photos;
