'use strict';

var AWS = require('../../libs/aws');

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    event: JSON.stringify(event),
  });

  // TODO Some basic validation here would be good...

  AWS.docClientPutAsync({
    TableName: process.env.CAPTURE_FORM_TABLE,
    Item: {
      full_name: event.body.full_name,
      phone_number: event.body.phone_number,
      email_address: event.body.email_address,
      contact_preference: event.body.contact_preference,
      street_address: event.body.street_address;
    }
  })

  // Success, return to user
  .then(data => {

    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'OK'
    };

    callback(null, response);
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ': ' + error.error);
    } else {
      console.log('There was an error submitting this form', error);
    }

    // Report error to user
    callback(JSON.stringify({
      message: 'There was an error submitting this form for processing',
      error: error
    }));
  });
};
