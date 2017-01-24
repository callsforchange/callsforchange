'use strict';

const civicinfo = require('../libs/google').civicinfo('v2');
const mailchimp = require('../libs/mailchimp');

const aws = require('../libs/aws')

var userObj = {
  TableName: 'subscribers',
  Item: {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    preference: '',
    district: '',
    street: '',
    city: '',
    state: '',
    zip: 0,
    mailChimpStatus: '',
    InsertionTimeStamp: 0
  }
};

function normalizePhoneNumber(number) {
  var normalized;
  if (Array.isArray(number)) {
    normalized = number[0];
  } else if(number === undefined) {
    normalized = '';
  } else {
    normalized = number;
  }
  normalized = normalized.replace(/\D/g,'');

  if (normalized.length !== 10) {
    console.log(`Unknown phone format '${number}' normalized to '${normalized}'!`);
    return '';
  } else {
    return normalized.substr(0,3) + '-' + normalized.substr(3,3) + '-' + normalized.substr(6,4);
  }
}

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

  var representativeObj = {
    TableName: 'representatives',
    Item: {
      district: '',
      senate1name: '',
      senate1number: '',
      senate2name: '',
      senate2number: '',
      repname: '',
      repnumber: ''
    }
  };

  // transform name
  var nameParts = (event.body.full_name || '').split(' ');

  userObj.Item.InsertionTimeStamp = (new Date()).getTime()/1000;
  userObj.Item.email = event.body.email_address;
  userObj.Item.firstName = nameParts.shift();
  userObj.Item.lastName = nameParts.join(' ');
  userObj.Item.preference = event.body.contact_preference || 'email';
  userObj.Item.phoneNumber = normalizePhoneNumber(event.body.phone_number);

  // Wrap Civic API call in a promise and call Google
  new Promise((resolve, reject) => {
    civicinfo.representatives.representativeInfoByAddress({
      address: event.body.street_address,
      levels: ['country'],
      roles: ['legislatorLowerBody', 'legislatorUpperBody'],
      fields: 'normalizedInput,officials(name,phones,photoUrl),offices(name, roles, officialIndices)'
    }, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  })

  // Parse and process rep data
  .then(data => {
    console.log('Received some information from CIVIC API ' + JSON.stringify(data));

    var district = data.offices
      .filter(o => o.roles.indexOf('legislatorLowerBody') >= 0)
      .map(o => o.name)
      .filter(name => name.match(/[A-Z]{2}-\d\d?$/))
      .map(name => name.match(/[A-Z]{2}-\d\d?$/)[0])[0];

    userObj.Item.district = district;
    userObj.Item.street = data.normalizedInput.line1;
    userObj.Item.city = data.normalizedInput.city;
    userObj.Item.state = data.normalizedInput.state;
    userObj.Item.zip = data.normalizedInput.zip;

    var house_index = data.offices
      .filter(o => o.roles.indexOf('legislatorLowerBody') >= 0)
      .map(o => o.officialIndices[0])[0];

    var senate_indices = data.offices
      .filter(o => o.roles.indexOf('legislatorUpperBody') >= 0)
      .map(o => o.officialIndices)[0];

    var official_1 = data.officials[senate_indices[0]];
    var official_2 = data.officials[senate_indices[1]];

    representativeObj.district = district;
    representativeObj.senate1name = official_1.name;
    representativeObj.senate1number = normalizePhoneNumber(official_1.phones);
    representativeObj.senate2name = official_2.name;
    representativeObj.senate2number = normalizePhoneNumber(official_2.phones);
    representativeObj.repname = data.officials[house_index].name;
    representativeObj.repnumber = normalizePhoneNumber(data.officials[house_index].phones);

    // Send new info to MailChimp
    return mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: userObj.Item.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: userObj.Item.firstName || '',
        LNAME: userObj.Item.lastName || '',
        H_NAME:   data.officials[house_index].name,
        H_PHONE:  normalizePhoneNumber(data.officials[house_index].phones),
        H_PHOTO:  data.officials[house_index].photoUrl,
        S1_NAME:  official_1.name,
        S1_PHONE: normalizePhoneNumber(official_1.phones),
        S1_PHOTO: official_1.photoUrl,
        S2_NAME:  official_2.name,
        S2_PHONE: normalizePhoneNumber(official_2.phones),
        S2_PHOTO: official_2.photoUrl
      }
    })
  })

  // Once subscribed to MC, save to our DBs for re-processing
  .then(data => {
    console.log(`User subscribed successfully to ${data.list_id}! Look for the confirmation email.`);
    console.log(JSON.stringify(data))

    userObj.Item.mailChimpStatus = 'subscribed';
  })

  .then(() => aws.docClientPut(userObj))
  .then(() => console.log('User input successful: ', userObj.Item.email))

  .then(() => aws.docClientPut(representativeObj))
  // TODO: Replace this with a bootstrap script for reps table, this does massively redundant table writes - Joe S
  .then(() => console.log('Representative input successful: ', representativeObj.Item.district))

  // Success, return to user
  .then(() => {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'OK'
    };

    callback(null, response);
  })

  // TODO: Handle errors better here -- what caused it and why, better reporting
  // Dang, an error.
  .catch(error => {
    if (error.error) {
      console.log(error.code + ': ' + error.error);
    } else {
      console.log('There was an error subscribing that user', error);
    }

    userObj.Item.mailChimpStatus = 'errorNotSubscribed';

    return aws.docClientPut(userObj)
    .then(() => console.log('User input successful: ', userObj.Item.email))
    .catch(error => console.log('Error adding user object to database: ', error))

    // Report error to user
    .then(() => {
      callback(JSON.stringify({
        message: 'There was an error subscribing this user',
        error: error
      }));
    })
  });
};
