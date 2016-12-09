/**
 * Controller: Schedule-Fanout
 * - Scans for all notifications that should go out in the next 15 minutes.
 */

var AWS = require('aws-sdk');

// TODO: Reach out to the provided user through their preferred notification platform.
// TODO: SNS (push notifications)
// TODO: Twilio (push-to-call)
// TODO: SES (email)
module.exports.handler = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
      context: context,
    }),
  };

  callback(null, response);
};
