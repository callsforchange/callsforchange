var AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION
});

var docClient = new AWS.DynamoDB.DocumentClient();

function removeEmptyStringElements(obj) {
  for (var prop in obj) {
    if (typeof obj[prop] === 'object') {// dive deeper in
      removeEmptyStringElements(obj[prop]);
    } else if(obj[prop] === '') {// delete elements that are empty strings
      delete obj[prop];
    }
  }
  return obj;
}

module.exports = {
  docClientPutAsync: function(doc) {
    return new Promise((resolve, reject) => {
    docClient.put(removeEmptyStringElements(doc), (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
}
