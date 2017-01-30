/**
 * Controller: Migration
 * - Prepares all external services for integration with the app; this includes, but
 *   is not limited to, creating mailchimp custom fields, registering webhook callbacks,
 *   creating indices and prepared data structures in dynamodb, &c.
 */

var civicinfo_utils = require('../libs/civicinfo_utils');
var AWS = require('aws-sdk');
var fs = require('fs');

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

function rescan_reps_table() {
  const state_lookup = JSON.parse(fs.readFileSync('./data/states.json', 'utf8'));
  const representatives = JSON.parse(fs.readFileSync('./data/representatives.json', 'utf8'));
  const senators = JSON.parse(fs.readFileSync('./data/senators.json', 'utf8'));

  const senators_by_state = senators.reduce((base, senator) => {
    base[senator.state] = (base[senator.state] || []).concat(senator);
    return base;
  }, {});

  return Promise.all(representatives
  .filter(rep => !Number.isNaN(Number.parseInt(rep.district)))
  .map(rep => {
    const district = `${state_lookup[rep.state].toUpperCase()}-${rep.district.length === 1 ? "0" : ""}${rep.district}`;
    const senators = senators_by_state[state_lookup[rep.state].toLowerCase()];

    return docClient.put({
      TableName: 'representatives',
      Item: {
        district: district,
        repname: `${rep.first_name.replace(/"/g,'').trim()} ${rep.last_name.replace(/"/g,'').trim()}`,
        repnumber: civicinfo_utils.normalizePhoneNumber(rep.phone_number),
        senate1name: `${senators[0].first_name.replace(/"/g,'').trim()} ${senators[0].last_name.replace(/"/g,'').trim()}`,
        senate1number: civicinfo_utils.normalizePhoneNumber(senators[0].phone_number),
        senate2name: `${senators[1].first_name.replace(/"/g,'').trim()} ${senators[1].last_name.replace(/"/g,'').trim()}`,
        senate2number: civicinfo_utils.normalizePhoneNumber(senators[1].phone_number)
      }
    }).promise();
  }));
}

module.exports.handler = (event, context, callback) => {
  rescan_reps_table()
  .then(values => {
    callback(null, { values: values });
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ': ' + error.error);
    } else {
      console.log('There was an error rehydrating data!');
    }
    callback(JSON.stringify({
      message: 'There was an error!',
      error: error
    }));
  });

};
