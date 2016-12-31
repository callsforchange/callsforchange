/**
 * Controller: Migration
 * - Prepares all external services for integration with the app; this includes, but
 *   is not limited to, creating mailchimp custom fields, registering webhook callbacks,
 *   creating indices and prepared data structures in dynamodb, &c.
 */

var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

const expected_merge_fields = {
  REP1_NAME:  { name: 'REP1_NAME',  tag: 'REP1_NAME',  type: 'text' },
  REP1_PHOTO: { name: 'REP1_PHOTO', tag: 'REP1_PHOTO', type: 'imageurl', required: true },
  REP1_PHONE: { name: 'REP1_PHONE', tag: 'REP1_PHONE', type: 'phone',    required: true, options: { phone_format: 'US' } },
  REP2_NAME:  { name: 'REP2_NAME',  tag: 'REP2_NAME',  type: 'text' },
  REP2_PHOTO: { name: 'REP2_PHOTO', tag: 'REP2_PHOTO', type: 'imageurl', required: true },
  REP2_PHONE: { name: 'REP2_PHONE', tag: 'REP2_PHONE', type: 'phone',    required: true, options: { phone_format: 'US' } },
  REP3_NAME:  { name: 'REP3_NAME',  tag: 'REP3_NAME',  type: 'text' },
  REP3_PHOTO: { name: 'REP3_PHOTO', tag: 'REP3_PHOTO', type: 'imageurl', required: true },
  REP3_PHONE: { name: 'REP3_PHONE', tag: 'REP3_PHONE', type: 'phone',    required: true, options: { phone_format: 'US' } }
};

function list_field_migrate() {
  // default is 10, but with FNAME and LNAME already available by default, lets just go to 50 and call it a day
  return mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields?count=50`)
  .then(fields => {
    const existing_field_tags = new Map(fields.merge_fields.map(f => [f.tag, f]));
    console.log('Existing fields: ' + JSON.stringify(Array.from(existing_field_tags.keys())));

    const missing_fields = Object.keys(expected_merge_fields)
      .filter(tag => !existing_field_tags.has(tag))
      .map(tag => expected_merge_fields[tag]);
    console.log('Missing merge fields: ' + JSON.stringify(missing_fields));

    const missing_fields_promises = missing_fields
      .map(missing_field => mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields`, missing_field));

    const modified_fields = Object.keys(expected_merge_fields)
      .filter(tag => existing_field_tags.has(tag))
      .map(tag => expected_merge_fields[tag])
      .filter(f => existing_field_tags.get(f.tag).name !== f.name || existing_field_tags.get(f.tag).type !== f.type)
    console.log('Modified merge fields: ' + JSON.stringify(modified_fields));

    const modified_fields_promises = modified_fields
      .map(modified_field => mailchimp.patch(`/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields/${existing_field_tags.get(f.tag).merge_id}`, modified_field));

    return Promise.all(missing_fields_promises.concat(modified_fields_promises));
  });
}

const expected_webhooks = {
  subscribe: {},
  unsubscribe: {}
};

function list_webhook_register() {
  // return mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}/
}

module.exports.handler = (event, context, callback) => {
  Promise.all([
    list_field_migrate()

  ]).then(values => {
    callback(null, { values: values });
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ": " + error.error);
    } else {
      console.log('There was an error performing migrations!');
    }
    callback(JSON.stringify({
      message: 'There was an error!',
      error: error
    }));
  });

};
