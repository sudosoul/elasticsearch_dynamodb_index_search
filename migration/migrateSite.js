const Dynamo = require('dynamodb');
const Joi    = require('joi');
Dynamo.AWS.config.update({accessKeyId: 'AKIAJTOTW3WG3O6BQNCQ', secretAccessKey: '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', region: "us-east-1"});



const Source = getSourceTable();

Source
  .query('hoichoitv')
  .filter('objectKey').equals('video')
  .loadAll()
  .exec(processItems);


function processItems(err, items) {
  const processing = [];
  for (let x=0; x<5; x++) {
    processing.push(migrate(items.Items[x]));
  }
  Promise.all(processed => {
    console.log('successfully migrated');
  }).catch(e => {
    console.log('error migrating - ', e);
  });
}


function migrate(item) {
  const Destination = getDestinationTable();
  const data = {
    site: item.get('site'),
    id: item.get('id'),
    objectKey: item.get('objectKey'),
  };
  return new Promise((resolve, reject) => {
    Destination.create(data, (err, res) => {
      if (err) {
        reject(err);
      } else {
        console.log(item.get('title'));
        resolve(true);
      }
    });
  });
}


function getSourceTable() {
  const Meta = Dynamo.define('Meta', {
    hashKey : 'site',
    rangeKey: `id`
  });
  Meta.config({tableName: 'PROD.CONTENT.CONTENT_METADATA'});
  return Meta;
}


function getDestinationTable() {
  const Meta = Dynamo.define('Meta', {
    hashKey : 'site',
    rangeKey: `id`,
    schema: {
      site: Joi.string(),
      id:   Joi.string(),
      objectKey: Joi.string()
    }
  });
  Meta.config({tableName: 'DEVELOP.CONTENT.CONTENT_METADATA_3'});
  return Meta;
}


