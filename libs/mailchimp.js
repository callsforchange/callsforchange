var mcapi = require('mailchimp-api');

module.exports = new mcapi.Mailchimp(process.env.MAILCHIMP_API);
