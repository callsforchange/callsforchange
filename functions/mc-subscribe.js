'use strict';

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'MailChimp Subscribe message received!',
    event: JSON.stringify(event),
    context: context
  });
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain"
    },
    body: "User-agent: *\r\nDisallow: /\r\n"
  };

  callback(null, response);
};

