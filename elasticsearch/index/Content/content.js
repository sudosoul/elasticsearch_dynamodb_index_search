/**
 * Indexes Content according to Content Type (video, image, etc)
 * Routes the index operation to the appropriate class.
 *
 * REQUIRED ENVIRONMENT VARIABLES
 *  AWS_REGION  - The AWS Region, available by default by Lambda.
 *  STAGE       - The development stage (dev, staging, prod).
 *  ES_ENDPOINT - The URL endpoint to the ElasticSearch cluster.
 *  ES_VERSION  - The version of ElasticSearch used on our cluster.
 *  ES_SUGGEST_SKIP - Comma separated string including the words to skip (a,the,of,in).
 *  
 *
 * @requires index.js
 *
 * @author Rob Mullins <rob@viewlift.com>
 * @version 2.0.0
 */

// Load Dependencies:
const Videos = require('./videos'); // Import video content type class

/**
 * Indexes content according by its type (video, image, etc).
 *
 */
class Content {

  /**
   * Constructor
   */
  constructor() {
    this.videos = new Videos();
  }

  /**
   * Indexes content according to its type
   * Calls class associate with the content type.
   *
   * @param {object} record - The DynamoDB record
   */
  index(record) {
    //** Route Content Indexing to Class By Content Type **//
    const type   = record.dynamodb.NewImage ? record.dynamodb.NewImage.objectKey.S : record.dynamodb.OldImage.objectKey.S; // NewImage only exists on Insert/Modify events, OldImage must be used on Remove
    const action = record.eventName === 'INSERT' || record.eventName === 'MODIFY' ? 'INSERT' : 'REMOVE'; // Determine action to perform on index (insert or remove)
    console.log('printing dynamodb keys - ', record.dynamodb.Keys);
    switch (type) {
      // Index Video Content
      case 'video':
        return this.videos.index(action, record.dynamodb.Keys.site.S, record.dynamodb.Keys.id.S);
        break;
    // create new cases for additional content type (images, etc)
    // case 'image':
    //   return this.images.index(...);
    //   break;
    }
  }
}

//** Expose this Content Class **//
module.exports = Content;



