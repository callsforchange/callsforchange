'use strict';

module.exports.handler = (event, context, callback) => {
  console.log({
    context: context,
    event: JSON.stringify(event),
  });
  callback(null, {});
};
