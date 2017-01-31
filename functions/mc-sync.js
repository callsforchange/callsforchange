'use strict';

var sleep = require('system-sleep');
var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  console.log({
    message: 'Received a message!',
    context: JSON.stringify(context),
    event: JSON.stringify(event),
  });

  const batch_size = 300;
  var promises = [];
  mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}`)
  .then(list_data => {
    for(var count = 0; count < list_data.stats.member_count; count += batch_size) {
      sleep(200);
      promises = promises.concat(
        mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}/members?offset=${count}&limit=${batch_size}`)
        .then(mc_response => {
          console.log(`Members: ${JSON.stringify(mc_response)}`);

          var mailchimp_id;
          return Promise.all(mc_response.members.map(member => {
            mailchimp_id = member.id;

            console.log(`Member: ${JSON.stringify(member)}`);
            return docClient.query({
              TableName: 'subscribers',
              ProjectionExpression: 'district',
              KeyConditionExpression: 'email = :email and InsertionTimeStamp > :time',
              ExpressionAttributeValues: {
                ':email': member.email_address,
                ':time': 0
              }
            }).promise()

            .then(subscriber => {
              console.log(`Subscriber: ${JSON.stringify(subscriber)}`);
              if (subscriber.Items.length === 0) return null;

              return docClient.get({
                TableName: 'representatives',
                Key: {
                  district: subscriber.Items[0].district
                }
              }).promise();
            })

            .then(representatives => {
              console.log(`Representative: ${JSON.stringify(representatives)}`);
              return {
                method: 'POST',
                path: `lists/${process.env.MAILCHIMP_LIST_ID}/members/${member.id}`,
                body: {
                  merge_fields: {
                    H_NAME:   representatives.Item.repname,
                    H_PHONE:  representatives.Item.repnumber,
                    S1_NAME:  representatives.Item.senate1name,
                    S1_PHONE: representatives.Item.senate1number,
                    S2_NAME:  representatives.Item.senate2name,
                    S2_PHONE: representatives.Item.senate2number,
                  }
                }
              };
            })

            .catch(error => {
              console.log('There was an error ' + JSON.stringify(error));
            });
          }))

          .then(all_results => {
            console.log(`Results: ${JSON.stringify(all_results)}`);
            return mailchimp.post('/batches', all_results);
          })

          .catch(error => {
            console.log(`There was an error: ${JSON.stringify(error)}`);
          });

        })
      );
    }

    return Promise.all(promises)
  })

  // Success, return to user
  .then(() => {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'OK'
    };

    callback(null, response);
  })

  .catch(error => {
    if (error.error) {
      console.log(error.code + ': ' + error.error);
    } else {
      console.log('There was an error subscribing that user', error);
    }
  });
};
