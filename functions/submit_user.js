'use strict';

var Promise = require('bluebird');
var civicinfo = require('../libs/google').civicinfo('v2');
var mailchimp = require('../libs/mailchimp');

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

  Promise.promisify(civicinfo.representatives.representativeInfoByAddress)({
    address: event.body.address,
    levels: ['country'],
    roles: ['legislatorLowerBody', 'legislatorUpperBody'],
    fields: 'officials(channels,emails,name,phones,photoUrl)'
  })

  .then(data => {
    console.log('Received some information from CIVIC API ' + JSON.stringify(data));

    return mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: event.body.email,
      status: 'subscribed'
    })
  })

  .then(data => {
    console.log(`User subscribed successfully to ${data.list_id}! Look for the confirmation email.`);
    console.log(JSON.stringify(data))

    callback(null, {
      event: event,
      context: context,
      data: data
    });
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ": " + error.error);
    } else {
      console.log('There was an error subscribing that user');
    }
    callback(JSON.stringify({
      message: 'There was an error subscribing this user',
      error: error
    }));
  });
};
