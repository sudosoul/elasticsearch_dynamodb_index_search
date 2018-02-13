const Config = {
  es: {
    endpoint: process.env.ES_ENDPOINT
  },
  aws: {
    region: process.env.AWS_REGION
  },
  stage: process.env.STAGE
};

module.exports = Config;