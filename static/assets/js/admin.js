/* global $ */

$('#twilio').submit(function (event) {
  event.preventDefault()
  // we're not gonna validate here, it's fine
  console.log('Handler for .submit() called.')
  var data = {
    content: $('#sms-content')[0].value,
    password: $('#password')[0].value
  }
  console.log(data)
  $.post('https://httpbin.org/post', data, function (response) {
    console.log('got response', response)
  })
})
