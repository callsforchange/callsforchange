'use strict';

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'MailChimp Summary message received!',
    event: event,
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


