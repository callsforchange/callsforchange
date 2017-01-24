/**
 * Controller: Schedule-Fanout
 * - Scans for all notifications that should go out in the next 15 minutes.
 */

const aws = require('../libs/aws')
const twilio = require('../libs/twilio')

module.exports.handler = (event, context, callback) => {
  let user = event.user;

  // fetch reps
  aws.docClientGet({
    TableName: 'representatives',
    Key:{ district: user.district }
  })

  // decide best contact method(s)
  .then(reps => {
    return sendText(event.content, event.user.phoneNumber)
  })

  // update user object
  .then(sms => {
    return aws.docClientPut({
      TableName: 'subscribers',
      Key:{
        email: user.email,
        InsertionTimeStamp: user.InsertionTimeStamp
      },
      UpdateExpression: "set lastTexted = :d",
      ExpressionAttributeValues: {
          ":d": new Date().toIsoString()
      },
      ReturnValues: "UPDATED_NEW"
    })
  })

  .then(user => {
    const response = {
      statusCode: 201,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Created'
    };
    callback(null, JSON.stringify(response))
  })

  .catch(err => {
    callback(err)
  })
};

