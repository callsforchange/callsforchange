/**
 * Controller: Migration
 * - Prepares all external services for integration with the app; this includes, but
 *   is not limited to, creating mailchimp custom fields, registering webhook callbacks,
 *   creating indices and prepared data structures in dynamodb, &c.
 */

var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

var expected_merge_fields = [
  { name: 'REP1_NAME',  tag: 'REP1_NAME',  type: 'text' },
  { name: 'REP1_PHOTO', tag: 'REP1_PHOTO', type: 'imageurl', required: true },
  { name: 'REP1_PHONE', tag: 'REP1_PHONE', type: 'phone',    required: true, options: { phone_format: 'US' } },
  { name: 'REP2_NAME',  tag: 'REP2_NAME',  type: 'text' },
  { name: 'REP2_PHOTO', tag: 'REP2_PHOTO', type: 'imageurl', required: true },
  { name: 'REP2_PHONE', tag: 'REP2_PHONE', type: 'phone',    required: true, options: { phone_format: 'US' } },
  { name: 'REP3_NAME',  tag: 'REP3_NAME',  type: 'text' },
  { name: 'REP3_PHOTO', tag: 'REP3_PHOTO', type: 'imageurl', required: true },
  { name: 'REP3_PHONE', tag: 'REP3_PHONE', type: 'phone',    required: true, options: { phone_format: 'US' } }
];

module.exports.handler = (event, context, callback) => {
  // default is 10, but with FNAME and LNAME already available by default, lets just go to 50 and call it a day
  mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields?count=50`)
  .then(fields => {
    var existing_field_tags = new Set(fields.merge_fields.map(f => f.tag));

    console.log(JSON.stringify(fields));
    console.log('Detected tags: ' + JSON.stringify(Array.from(existing_field_tags)));
    console.log('Missing merge fields: ' + JSON.stringify(expected_merge_fields .filter(f => !existing_field_tags.has(f.tag) ) ) );

    return Promise.all(expected_merge_fields
      .filter(f => !existing_field_tags.has(f.tag) )
      .map(missing_field => mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields`, missing_field)));

  }).then(values => {
    console.log(`Fields properly created! ${JSON.stringify(values)}`);
    callback(null, {
      event: event,
      context: context,
      values: values 
    });
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ": " + error.error);
    } else {
      console.log('There was an error creating custom mailchimp fields!');
    }
    callback(JSON.stringify({
      message: 'There was an error!',
      error: error
    }));
  });
};
