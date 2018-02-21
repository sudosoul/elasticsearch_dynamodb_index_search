

class Search {

  constructor() {
    const client = elasticsearch.Client({
      host: 'https://search-content-v2-dev-zscnaomftfbmx6gzqk7iyeij2a.us-east-1.es.amazonaws.com',
      apiVersion:   '6.0',
      sniffOnStart: true
    });
    this.client = client;
  }

}