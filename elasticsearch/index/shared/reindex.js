const Index = require('./index');
const template = require('./template');    // Index Settings & Mappings


const index = new Index('https://search-site-search-testing-42wqsrnonzgjdlevbtovrvos4y.us-east-1.es.amazonaws.com', '6.0');

index.es.reindex({
  refresh: true,
  timeout: "60m",
  body: {
    "source": {
      "index": "snagfilms",
    },
    "dest": {
      "index": "snagfilms2"
    }
  }
});
