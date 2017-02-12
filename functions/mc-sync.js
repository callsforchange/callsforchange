'use strict';

var sleep = require('system-sleep');
var mailchimp = require('../libs/mailchimp');
var AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

function transformMemberToUpdate(member) {
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
    var user = subscriber.Items.find(item => item.district != null);
    if (user === undefined) {
      console.log('Member missing from table: ', member);
      throw {error: 'Unable to find user ' + member.email_address, member: member};
    } else {
      return docClient.get({
        TableName: 'representatives',
        Key: {
          district: user.district
        }
      }).promise();
    }
  })

  .then(representatives => {
    if (member.merge_fields.H_NAME   !== representatives.Item.repname       ||
        member.merge_fields.H_PHONE  !== representatives.Item.repnumber     ||
        member.merge_fields.S1_NAME  !== representatives.Item.senate1name   ||
        member.merge_fields.S1_PHONE !== representatives.Item.senate1number ||
        member.merge_fields.S2_NAME  !== representatives.Item.senate2name   ||
        member.merge_fields.S2_PHONE !== representatives.Item.senate2number) {
      return {
        method: 'PATCH',
        path: `lists/${process.env.MAILCHIMP_LIST_ID}/members/${member.id}`,
        body: JSON.stringify({
          merge_fields: {
            H_NAME:   representatives.Item.repname,
            H_PHONE:  representatives.Item.repnumber,
            S1_NAME:  representatives.Item.senate1name,
            S1_PHONE: representatives.Item.senate1number,
            S2_NAME:  representatives.Item.senate2name,
            S2_PHONE: representatives.Item.senate2number,
          }
        })
      };
    } else {
      console.log('Skipping pre-filled ' + member.email_address);
      return Promise.resolve(false);
    }
  })

  .catch(error => {
    console.log('There was a user-lookup error for ' + member.email_address);
    return Promise.resolve(false);
  });
}

function processBatch(count, batch_size) {
  return mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}/members?offset=${count}&limit=${batch_size}`)
  .then(mc_response => Promise.all(mc_response.members.map(member => transformMemberToUpdate(member))))

  .then(all_results => {
    const filtered_results = all_results.filter(res => res != false);
    if (filtered_results.length > 0) {
      console.log('Applying batches: ', filtered_results);
      return mailchimp.post('/batches', {
        operations: filtered_results
      });
    } else {
      return Promise.resolve(true);
    }
  })

  .then(result => {
    return Promise.resolve(true);
  })

  .catch(error => {
    console.log('There was a batching error', error);
    return Promise.resolve(true);
  });
}

module.exports.handler = (event, context, callback) => {
  const batch_size = 10;
  var promise = Promise.resolve(true);
  mailchimp.get(`/lists/${process.env.MAILCHIMP_LIST_ID}`)
  .then(list_data => {
    for(var count = 0; count < list_data.stats.member_count; count += batch_size) {
      promise = promise.then(() => processBatch(count, batch_size)).then(sleep(100));
    }
    return promise;
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
    return Promise.resolve(true);
  });
};
