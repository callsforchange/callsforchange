'use strict';

var civicinfo = require('../libs/google').civicinfo('v2');
var mailchimp = require('../libs/mailchimp');

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

  new Promise((resolve, reject) => {
    civicinfo.representatives.representativeInfoByAddress({
      address: event.body.address,
      levels: ['country'],
      roles: ['legislatorLowerBody', 'legislatorUpperBody'],
      fields: 'officials(name,phones,photoUrl)'
    }, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  })

  .then(data => {
    console.log('Received some information from CIVIC API ' + JSON.stringify(data));

    return mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: event.body.email,
      status: 'subscribed',
      merge_fields: {
        REP1_NAME: data.officials[0].name,
        REP1_PHONE: data.officials[0].phones[0],
        REP1_PHOTO: data.officials[0].photoUrl
        REP2_NAME: data.officials[1].name,
        REP2_PHONE: data.officials[1].phones[0],
        REP2_PHOTO: data.officials[1].photoUrl
        REP3_NAME: data.officials[2].name,
        REP3_PHONE: data.officials[2].phones[0],
        REP3_PHOTO: data.officials[2].photoUrl
      }
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
