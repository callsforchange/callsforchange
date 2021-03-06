'use strict';

module.exports.handler = (event, context, callback) => {
  console.log({
    context: context,
    event: event,
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
