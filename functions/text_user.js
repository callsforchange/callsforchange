/**
 * Controller: Schedule-Fanout
 * - Scans for all notifications that should go out in the next 15 minutes.
 */

const aws = require('../libs/aws')
const twilio = require('../libs/twilio')
let repsCache = {}

function replaceRepInfo (rep, content) {
  content
    .replace(
      '{{ALL_REP_INFO}}',
      `${rep.repname}: ${rep.repnumber || 'Unknown'}, ${rep.senate1name}: ${rep.senate1number || 'Unknown'}, ${rep.senate2name}: ${rep.senate2number || 'Unknown'}`
    )
    .replace(
      '{{HOUSE_INFO}}',
      `${rep.repname}: ${rep.repnumber || 'Unknown'}`
    )
    .replace(
      '{{SENATE_INFO}}',
      `${rep.senate1name}: ${rep.senate1number || 'Unknown'}, ${rep.senate2name}: ${rep.senate2number || 'Unknown'}`
    )
  return content
}

module.exports.handler = (event, context, callback) => {
  let user = event.user;
  let p;

  // fetch reps
  if (!repsCache[user.district]) {
    p = aws.docClientGet({
      TableName: 'representatives',
      Key: { district: user.district }
    })
  } else {
    p = Promise.resolve(repsCache[user.district])
  }

  // decide best contact method(s)
  p.then(rep => {
    rep = rep.Item
    if (!repsCache[user.district]) {
      repsCache[user.district] = rep
    }

    return twilio.sendText(replaceRepInfo(event.content, rep), user.phoneNumber)
  })

  // update user object
  .then(sms => {
    return aws.docClientPut({
      TableName: 'subscribers',
      Key: {
        email: user.email,
        InsertionTimeStamp: user.InsertionTimeStamp
      },
      UpdateExpression: 'set lastTexted = :d',
      ExpressionAttributeValues: {
        ':d': new Date().toIsoString()
      },
      ReturnValues: 'UPDATED_NEW'
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

