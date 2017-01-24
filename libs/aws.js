const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION
});

const docClient = new AWS.DynamoDB.DocumentClient();

function removeEmptyStringElements (obj) {
  for (var prop in obj) {
    if (typeof obj[prop] === 'object') {// dive deeper in
      removeEmptyStringElements(obj[prop]);
    } else if(obj[prop] === '') {// delete elements that are empty strings
      delete obj[prop];
    }

  }
  return obj;
}

function docClientPut (doc) {
  return new Promise((resolve, reject) => {
    docClient.put(removeEmptyStringElements(doc), (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}

function docClientGet (doc) {
  return new Promise((resolve, reject) => {
    docClient.put(removeEmptyStringElements(doc), (err, data) => {
      if (err) reject(err);
      else resolve(data);
    })
  });
}

function lambdaFactory () {
  return new AWS.Lambda();
}

module.exports = {
  docClientPut,
  docClientGet,
  lambdaFactory
}
