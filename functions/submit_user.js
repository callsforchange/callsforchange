'use strict';

var civicinfo = require('../libs/google').civicinfo('v2');
var civicinfo_utils = require('../libs/civicinfo_utils');
var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

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

  userObj.Item.InsertionTimeStamp = (new Date()).getTime()/1000;
  userObj.Item.email = event.body.email_address;
  userObj.Item.firstName = event.body.first_name;
  userObj.Item.lastName = event.body.last_name;
  userObj.Item.preference = event.body.contact_preference || 'email';
  userObj.Item.phoneNumber = civicinfo_utils.normalizePhoneNumber(event.body.phone_number);

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
    const res = civicinfo_utils.representativeProcessing(data);

    userObj.Item.district = res.district;
    userObj.Item.street = data.normalizedInput.line1;
    userObj.Item.city = data.normalizedInput.city;
    userObj.Item.state = data.normalizedInput.state;
    userObj.Item.zip = data.normalizedInput.zip;

    representativeObj.Item.district = res.district;
    representativeObj.Item.senate1name = res.senators[0].name;
    representativeObj.Item.senate1number = civicinfo_utils.normalizePhoneNumber(res.senators[0].phones);
    representativeObj.Item.senate2name = res.senators[1].name;
    representativeObj.Item.senate2number = civicinfo_utils.normalizePhoneNumber(res.senators[1].phones);
    representativeObj.Item.repname = res.representative.name;
    representativeObj.Item.repnumber = civicinfo_utils.normalizePhoneNumber(res.representative.phones);

    // Send new info to MailChimp
    return mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: userObj.Item.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: userObj.Item.firstName || '',
        LNAME: userObj.Item.lastName || '',
        H_NAME:   res.representative.name,
        H_PHONE:  civicinfo_utils.normalizePhoneNumber(res.representative.phones),
        H_PHOTO:  res.representative.photoUrl,
        S1_NAME:  res.senators[0].name,
        S1_PHONE: civicinfo_utils.normalizePhoneNumber(res.senators[0].phones),
        S1_PHOTO: res.senators[0].photoUrl,
        S2_NAME:  res.senators[1].name,
        S2_PHONE: civicinfo_utils.normalizePhoneNumber(res.senators[1].phones),
        S2_PHOTO: res.senators[1].photoUrl
      }
    })
  })

  // Once subscribed to MC, save to our DBs for re-processing
  .then(data => {
    console.log(`User subscribed successfully to ${data.list_id}! Look for the confirmation email.`);
    console.log(JSON.stringify(data))

    userObj.Item.mailChimpStatus = 'subscribed';
  })

  .then(() => docClient.put(civicinfo_utils.removeEmptyStringElements(userObj)).promise())
  .then(() => console.log('User input successful: ', userObj.Item.email))

  .then(() =>docClient.put(civicinfo_utils.removeEmptyStringElements(representativeObj)).promise())
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

    return docClient.put(civicinfo_utils.removeEmptyStringElements(userObj)).promise()
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
