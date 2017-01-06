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
      fields: 'normalizedInput,officials(name,phones,photoUrl),offices(roles, officialIndices)'
    }, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  })

  .then(data => {
    console.log('Received some information from CIVIC API ' + JSON.stringify(data));

    var house_index = data.offices
      .filter(o => o.roles[0] === 'legislatorLowerBody')
      .map(o => o.officialIndices[0])[0];

    var senate_indices = data.offices
      .filter(o => o.roles[0] === 'legislatorUpperBody')
      .map(o => o.officialIndices)[0];

    return mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: event.body.email,
      status: 'subscribed',
      merge_fields: {
        HOUSE_REP_NAME:    data.officials[house_index].name,
        HOUSE_REP_PHONE:   data.officials[house_index].phones[0],
        HOUSE_REP_PHOTO:   data.officials[house_index].photoUrl,
        SENATE_REP1_NAME:  data.officials[senate_indices[0]].name,
        SENATE_REP1_PHONE: data.officials[senate_indices[0]].phones[0],
        SENATE_REP1_PHOTO: data.officials[senate_indices[0]].photoUrl,
        SENATE_REP2_NAME:  data.officials[senate_indices[1]].name,
        SENATE_REP2_PHONE: data.officials[senate_indices[1]].phones[0],
        SENATE_REP2_PHOTO: data.officials[senate_indices[1]].photoUrl
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
