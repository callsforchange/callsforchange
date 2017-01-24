'use strict';

var AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

function docClientPut(doc) {
  return new Promise((resolve, reject) => {
    docClient.put(removeEmptyStringElements(doc), (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

  var ingestObj = {
    TableName: 'ingest',
    Item: {
      insertionTimeStamp: (new Date()).getTime()/1000,
      firstName: event.body.first_name,
      lastName: event.body.last_name,
      emailAddress: event.body.email_address,
      contactPreference: event.body.contact_preference,
      phoneNumber: event.body.phone_number
    }
  };

  docClientPut(ingestObj);
}