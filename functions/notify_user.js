/**
 * Controller: Schedule-Fanout
 * - Scans for all notifications that should go out in the next 15 minutes.
 */

const twilio = require('twilio')(procces.env.TWILIO_ACCOUNT_SID, procces.env.TWILIO_AUTH_TOKEN)
const twilioNumber = '+17209032549'

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

  const method = fetchReachOut();
  // const message =

  if (method === 'twilio') {
    sendSms('+13038190850', 'great job!', callback)
  } else {
    callback(null, response);
  }

  // callback(null, response);
};

fetchReachOut = () => {
  // TODO: Get their preferred reach out method
  return 'twilio';
}

sendSms = (to, message, callback) => {
  twilio.messages.create({
    body: message,
    to: to,
    from: twilioNumber
  }, (err, data) => {
    if (err) {
      // throw new Error(err)
      console.log('err!', err)
    } else {
      callback(null, data)
    }
  });
};
