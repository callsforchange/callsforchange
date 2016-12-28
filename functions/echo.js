'use strict';

module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify({
    context: context,
    event: event,
  }));
  callback(null, {});
};
