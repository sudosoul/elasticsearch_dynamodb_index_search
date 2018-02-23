class Search {

  constructor() {
    const client = elasticsearch.Client({
      host: 'https://search-site-search-staging-qr2d6c7cl6w3plpcpgeaehyafm.us-east-1.es.amazonaws.com',
      apiVersion:   '6.0',
    });
    this.client = client;
  }

  suggestVideoTitle(prefix) {
    const self = this;
    return new Promise((fulfill, reject) => {
      self.client.search({
        index: 'hoichoitv',
        type:  'videos',
        body: {
          suggest: {
            suggestTitle : {
              prefix : prefix, 
              completion : { 
                field : "suggestTitle" 
              }
            }
          }
        }
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          fulfill(res.suggest.suggestTitle[0].options);
        }
      });
    });
  }

  searchVideos(title) {
    const self = this;
    return new Promise((fulfill, reject) => {
      self.client.search({
        index: 'hoichoitv',
        type:  'videos',
        body: {
          query: {
            match: {
              title: title
            }
          }
        }
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          fulfill(res.hits.hits);
        }
      });
    });
  }

}