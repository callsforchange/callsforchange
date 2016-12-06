var google = require('googleapis');
google.options({
  auth: process.env.GOOGLE_API,
});

module.exports = google;
