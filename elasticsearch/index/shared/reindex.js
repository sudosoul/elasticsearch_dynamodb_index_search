const Index = require('./index');

const index = new Index('https://search-site-search-staging-qr2d6c7cl6w3plpcpgeaehyafm.us-east-1.es.amazonaws.com', '6.0');

index.reindex()
  .then(res => {
    console.log(res);
}).catch(e => {
  console.log(e);
});