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

  userObj.Item.InsertionTimeStamp = (new Date()).getTime()/1000;
  userObj.Item.email = event.body.email_address;
  userObj.Item.firstName = event.body.first_name;
  userObj.Item.lastName = event.body.last_name;
  userObj.Item.preference = event.body.contact_preference || 'email';
  userObj.Item.phoneNumber = civicinfo_utils.normalizePhoneNumber(event.body.phone_number);

  var res;

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

  // Enrich the data with manually crawled data from local storage
  .then(civicInfoResponse => {
    res = civicinfo_utils.representativeProcessing(civicInfoResponse);

    userObj.Item.district = res.district;
    userObj.Item.street = civicInfoResponse.normalizedInput.line1;
    userObj.Item.city = civicInfoResponse.normalizedInput.city;
    userObj.Item.state = civicInfoResponse.normalizedInput.state;
    userObj.Item.zip = civicInfoResponse.normalizedInput.zip;

    return docClient.get({
      TableName: 'representatives',
      Key: {
        'district': res.district
      },
    }).promise();
  })

  // Parse and process rep data
  .then(representatives => {
    // {"Item":{"district":"NY-23","senate2number":"202-224-6542","senate1name":"Kirsten E. Gillibrand","senate2name":"Charles E. Schumer","senate1number":"202-224-4451","repnumber":"202-225-3161","repname":" Tom Reed"}}

    return mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: userObj.Item.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: userObj.Item.firstName || '',
        LNAME: userObj.Item.lastName || '',
        H_NAME:   representatives.Item.repname,
        H_PHONE:  representatives.Item.repnumber,
        S1_NAME:  representatives.Item.senate1name,
        S1_PHONE: representatives.Item.senate1number,
        S2_NAME:  representatives.Item.senate2name,
        S2_PHONE: representatives.Item.senate2number,
        H_PHOTO:  res.representative.photoUrl,
        S1_PHOTO: res.senators[0].photoUrl,
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
