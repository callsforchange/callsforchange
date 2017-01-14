/**
 * Controller: Migration
 * - Prepares all external services for integration with the app; this includes, but
 *   is not limited to, creating mailchimp custom fields, registering webhook callbacks,
 *   creating indices and prepared data structures in dynamodb, &c.
 */

var config = require('../libs/config');
var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

const expected_merge_fields = {
  H_NAME:    { display_order: 11, name: 'House Rep. Name',        required: false, tag: 'H_NAME',   type: 'text' },
  H_PHOTO:   { display_order: 12, name: 'House Rep. Photo',       required: false, tag: 'H_PHOTO',  type: 'imageurl'},
  H_PHONE:   { display_order: 13, name: 'House Rep. Phone',       required: false, tag: 'H_PHONE',  type: 'phone',   options: { phone_format: 'US' } },
  S1_NAME:   { display_order: 14, name: 'Senate Rep. 1\'s Name',  required: false, tag: 'S1_NAME',  type: 'text' },
  S1_PHOTO:  { display_order: 15, name: 'Senate Rep. 1\'s Photo', required: false, tag: 'S1_PHOTO', type: 'imageurl'},
  S1_PHONE:  { display_order: 16, name: 'Senate Rep. 1\'s Phone', required: false, tag: 'S1_PHONE', type: 'phone',   options: { phone_format: 'US' } },
  S2_NAME:   { display_order: 17, name: 'Senate Rep. 2\'s Name',  required: false, tag: 'S2_NAME',  type: 'text' },
  S2_PHOTO:  { display_order: 18, name: 'Senate Rep. 2\'s Photo', required: false, tag: 'S2_PHOTO', type: 'imageurl'},
  S2_PHONE:  { display_order: 19, name: 'Senate Rep. 2\'s Phone', required: false, tag: 'S2_PHONE', type: 'phone',   options: { phone_format: 'US' } }
};

function list_field_migrate() {
  // default is 10, but with FNAME and LNAME already available by default, lets just go to 50 and call it a day
  const field_url = `/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields?count=50`;
  console.log(`Fetching fields from ${field_url}`);

  return mailchimp.get(field_url)
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
      .filter(f => existing_field_tags.get(f.tag).name          !== f.name         ||
                   existing_field_tags.get(f.tag).type          !== f.type         ||
                   existing_field_tags.get(f.tag).required      !== f.required     ||
                   existing_field_tags.get(f.tag).display_order !== f.display_order)
    console.log('Modified merge fields: ' + JSON.stringify(modified_fields));

    const modified_fields_promises = modified_fields
      .map(modified_field => mailchimp.patch(`/lists/${process.env.MAILCHIMP_LIST_ID}/merge-fields/${existing_field_tags.get(modified_field.tag).merge_id}`, modified_field));

    return Promise.all(missing_fields_promises.concat(modified_fields_promises))
      .catch(error => console.log('There was an error during merge fields: ' + JSON.stringify(error)));
  });
}

const expected_webhooks = [
  {
    url: `${config.api_hostname[process.env.STAGE]}/mailchimp/hook/subscribe`,
    sources: { user: true, admin: true, api: true },
    events: { subscribe: true }
  },
  {
    url: `${config.api_hostname[process.env.STAGE]}/mailchimp/hook/unsubscribe`,
    sources: { user: true, admin: true, api: true },
    events: { unsubscribe: true }
  }
];

function list_webhook_register() {
  const webhook_url = `/lists/${process.env.MAILCHIMP_LIST_ID}/webhooks`;
  console.log(`Fetching webhooks from ${webhook_url}`);
  return mailchimp.get(webhook_url)
  .then(existing_hooks => {
    console.log('Existing webhooks: ' + JSON.stringify(existing_hooks));

    const existing_hook_urls = new Map(existing_hooks.webhooks.map(hook => [hook.url, hook]));
    console.log('Existing webhook urls: ' + JSON.stringify(Array.from(existing_hook_urls.keys())));

    const missing_hooks = expected_webhooks
      .filter(hook => !existing_hook_urls.has(hook.url));
    console.log('Missing webhooks: ' + JSON.stringify(missing_hooks));

    const missing_hooks_promises = missing_hooks
      .map(missing_hook => mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/webhooks`, missing_hook));

    return Promise.all(missing_hooks_promises)
      .catch(error => console.log('There was an error during web hooks: ' + JSON.stringify(error)));
  });
}

module.exports.handler = (event, context, callback) => {
  Promise.all([
    list_field_migrate(),
    list_webhook_register()
  ]).then(values => {
    callback(null, { values: values });
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ': ' + error.error);
    } else {
      console.log('There was an error performing migrations!');
    }
    callback(JSON.stringify({
      message: 'There was an error!',
      error: error
    }));
  });

};
