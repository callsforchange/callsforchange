/**
 * Controller: Schedule-Fanout
 * - Scans for all notifications that should go out in the next 15 minutes.
 */

const aws = require('../libs/aws')


function getToday () {
  // 2017-01-23
  return new Date().toIsoString().substr(0, 10);
}

const timeDiff = 1000 * 3600 * 24 * 5 // ms in 5 days

// TODO: Iterate over notifications, and submit async lambda's to notify per-user.
module.exports.handler = (event, context, callback) => {
  const lambda = aws.lambdaFactory();

  const today = getToday();

  // TODO: scan for users with a phone number and contact pref != email
  const params = {};

  Promise.all([
    aws.docClientScan(params),
    aws.docClientGet({
      TableName: 'messages',
      Key: { processed: false, sendOn: today }
    })
  ])

  // invoke a bunch of lambdas
  .then((users, content) => {
    return Promise.all(users.Items.map(user => {
      if ((new Date()).getTime() - Date.parse(user.lastTexted) > timeDiff) {
        return lambda.invoke({
          FunctionName: process.env.NOTIFY_USER_FUNCTION_NAME,
          InvocationType: 'Event',
          Payload: JSON.stringify({
            user: user,
            content: content
          })
        });
      } else {
        // recently texted, ignore
      }
    }));
  })

  // update message object
  .then(res => {
    return aws.docClientPut({
      TableName: 'messages',
      Key: { processed: false, sendOn: today },
      UpdateExpression: 'set processed = :v',
      ExpressionAttributeValues: {
        ':v': true
      },
      ReturnValues: 'UPDATED_NEW'
    });
  })

  // all done!
  .then(res => {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'sent a bunch of texts!',
        input: event
      })
    };
    callback(null, JSON.stringify(response));
  })

  .catch(err => {
    if (err.code === 'NotFound') { // i believe that's how to identify these?
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          message: 'something was not found: ' + JSON.stringify(err),
          input: event
        })
      };
      // if we didn't find something, it's fine. not sure if even error
      callback(null, JSON.stringify(response));
    } else {
      callback(err);
    }
  })
};
