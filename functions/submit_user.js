'use strict';

var mailchimp = require('../libs/mailchimp');

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: context,
    event: event,
  });

  mailchimp.lists.subscribe({id: process.env.MAILCHIMP_LIST_ID,
    email:{email:event.body.email},
  }, function(data) {
    console.log('User subscribed successfully to ' + process.env.MAILCHIMP_LIST_ID + '! Look for the confirmation email.');

    callback(null, {
      event: event,
      context: context,
      data: data
    });

  },
  function(error) {
    if (error.error) {
      console.log(error.code + ": " + error.error);
    } else {
      console.log('There was an error subscribing that user');
    }
    callback(JSON.stringify({
      message: 'Something interesting!',
      error: error
    }));
  });
};
