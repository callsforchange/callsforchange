'use strict';

var AWS = require('aws-sdk');
var google = require('googleapis');
var civicinfo = google.civicinfo('v2');


module.exports.handler = (event, context, callback) => {
  civicinfo.elections.electionQuery({}, {}, (err, elections) => {
    if (err) {
      callback(err);
      return;
    }
    const response = {
      event: event,
      context: context,
      elections: elections,
    };

    // callback(new Error("[400] Bad Monkey"));
    callback(null, response);
  });
};
