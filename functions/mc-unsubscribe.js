'use strict';

module.exports.handler = (event, context, callback) => {
  if (event.method === 'GET') {
    // the `GET` method is used by mailchimp to verify that the end-point exists
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'OK'
    };

    callback(null, response);
    return;
  }

  console.log(JSON.stringify({
    message: 'MailChimp Unsubscribe message received!',
    event: event,
    context: context
  }));

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain'
    },
    body: 'Unsubscribe message received!'
  };

  callback(null, response);
};

