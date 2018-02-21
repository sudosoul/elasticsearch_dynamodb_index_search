const ES       = require('elasticsearch'); // ElasticSearch SDK
const template = require('./template');    // Index Settings & Mappings



const es = new ES.Client({
  host:         'https://search-content-v2-dev-zscnaomftfbmx6gzqk7iyeij2a.us-east-1.es.amazonaws.com',
  log:          'error',
  apiVersion:   '6.0',
  sniffOnStart: true,
  keepAlive: false
}); 


createIndex('testing', template)
  .then(res => {
    console.log('success - ', res);
}).catch(e => {
  console.log(e);
})



function createIndex(name, template) {
    return es.indices.create({
      index: name,
      body:  template
    });
  }