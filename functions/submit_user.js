'use strict';

var civicinfo = require('../libs/google').civicinfo('v2');
var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-west-2'
});

var docClient = new AWS.DynamoDB.DocumentClient();
var userObj = {
  TableName: 'users',
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
    mailChimpStatus: ''
  }
};
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

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

  userObj.Item.email = event.body.email;
  userObj.Item.firstName = event.body.firstName || '';
  userObj.Item.lastName = event.body.lastName || '';
  userObj.Item.preference = event.body.preference || 'email';
  userObj.Item.phoneNumber = event.body.phoneNumber || '';

  new Promise((resolve, reject) => {
    civicinfo.representatives.representativeInfoByAddress({
      address: event.body.address,
      levels: ['country'],
      roles: ['legislatorLowerBody', 'legislatorUpperBody'],
      fields: 'normalizedInput,officials(name,phones,photoUrl),offices(name, roles, officialIndices)'
    }, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
  })

  .then(data => {
    console.log('Received some information from CIVIC API ' + JSON.stringify(data));

    userObj.Item.district = data.offices[0].name.match(/[A-Z]{2}-\d\d?$/);
    userObj.Item.street = data.normalizedInput.line1;
    userObj.Item.city = data.normalizedInput.city;
    userObj.Item.state = data.normalizedInput.state;
    userObj.Item.zip = data.normalizedInput.zip;

    var house_index = data.offices
      .filter(o => o.roles[0] === 'legislatorLowerBody')
      .map(o => o.officialIndices[0])[0];

    var senate_indices = data.offices
      .filter(o => o.roles[0] === 'legislatorUpperBody')
      .map(o => o.officialIndices)[0];

    representativeObj.Item.district = data.offices[0].name.match(/[A-Z]{2}-\d\d?$/);
    representativeObj.Item.senate1name = data.officials[senate_indices[0]].name;
    representativeObj.Item.senate1number = data.officials[senate_indices[0]].phones[0] || '';
    representativeObj.Item.senate2name = data.officials[senate_indices[1]].name;
    representativeObj.Item.senate2number = data.officials[senate_indices[1]].phones[0] || '';
    representativeObj.Item.repname = data.officials[house_index].name;
    representativeObj.Item.repnumber = data.officials[house_index].phones[0] || '';

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

    userObj.Item.mailChimpStatus = 'subscribed';
    
    docClient.put(userObj, function(err, data) {
      if (err) {
        console.log('Error adding user object to database: ', err);
      } else {
        console.log('User input successful: ', userObj.email);
      }
    });

    //TODO: Replace this with a bootstrap script for reps table, this does massively redundant table writes - Joe S
    docClient.put(representativeObj, function(err, data) {
      if (err) {
        console.log('Error adding representative to database: ', err);
      } else { 
        console.log('Representative input successful: ', representativeObj.district);
      }
    });

    callback(null, {
      event: event,
      context: context,
      data: data
    });
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ': ' + error.error);
    } else {
      console.log('There was an error subscribing that user');
    }
    userObj.Item.mailChimpStatus = 'errorNotSubscribed';
    docClient.put(userObj, function(err, data) {
      if (err) {
        console.log('Error adding user object to database: ', err);
      } else {
        console.log('User input successful: ', userObj.email);
      }
    });
    callback(JSON.stringify({
      message: 'There was an error subscribing this user',
      error: error
    }));
  });
};
