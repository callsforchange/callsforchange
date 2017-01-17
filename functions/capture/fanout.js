/**
 * Controller: Schedule-Fanout
 * - Scans for all notifications that should go out in the next 15 minutes.
 */

var AWS = require('aws-sdk');
var lambda = new AWS.Lambda();

// TODO: Iterate over notifications, and submit async lambda's to notify per-user.
module.exports.handler = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };

  lambda.invoke({
    FunctionName: process.env.SUBMIT_USER_FUNCTION_NAME,
    InvocationType: 'Event',
    Payload: JSON.stringify({
      some_variable: 'some_value'
    })
  }, callback);
};
