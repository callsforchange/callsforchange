const twilio = require('twilio');
const client = new twilio.RestClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const ourNumber = '+16504223414'


function phoneNumberForTwilio (n) {
  // remove dashes from phone and add correct US prefix
  return '+1' + n.split('-').join('')
}

// returns a promise
function sendText (content, destNumber) {
  return client.messages.create({
    body: event.message,
    to: utils.phoneNumberForTwilio(destNumber),
    from: ourNumber
  })
}
