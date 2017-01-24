(function() {
  var $ = jQuery.noConflict();
  var API_SUBDOMAIN = 'api';
  var API = {
    REGISTER: '/users/register'
  };
  var STORAGE = {
    RALLY_NAME_KEY: 'rally-name',
    SAVED_CONTACTS_KEY: 'saved-contacts'
  }

  // form setup (domain) & hooks
  function setupForm(selector) {
    var form = $(selector);
    if (form.length === 0) { return; }

    // Contact preference
    form.find('input[name=contact_preference]:radio').click(function () {
      contactChangeHandler(form);
    });
    contactChangeHandler(form);

    // Form handler
    form.attr('action', apiServer() + API.REGISTER);
    form.submit(submitHandler);
  }

  function contactChangeHandler(form) {
    var preference = form.find('input[name=contact_preference]:checked').val();
    form.find('input[name=email_address]').attr('required', (preference === 'email' || preference === 'both'));
    form.find('input[name=phone_number]').attr('required', (preference === 'sms' || preference === 'both'));
  }

  function submitHandler(event) {
    form = $(event.target);
    event.preventDefault();

    // data-offline on form to track
    if (isOffline(form)) {
      // save to localStorage
      showFormSuccess(form);
      return;
    }

    // Fall through allows form to send via AJAX
    submitFormAjax(form);
  }

  function submitFormAjax(form) {
    lockFormButton(form);
    clearFormMessage(form);

    $.ajax({
      type: "POST",
      url: form.attr('action'),
      data: form.serialize()
    })
    .then(function (data) { showFormSuccess(form); })
    .catch(function (error) { showAjaxErrors(form, error); })
    .then(function () { unlockFormButton(form); });
  }

  function apiServer() {
    var location = window.location;
    var baseDomain = location.host.replace('www.', '');
    return location.protocol + '//' + API_SUBDOMAIN + '.' + baseDomain;
  }

  function lockFormButton(form) {
    var submit = $(form).find('input[type="submit"]');
    submit.attr('disabled', true);
  }

  function unlockFormButton(form) {
    var submit = $(form).find('input[type="submit"]');
    submit.attr('disabled', false);
  }

  function showFormSuccess(form) {
    // TODO
    $(form)[0].reset();
    setFormMessage(form, 'All set, we received your information!  Look for your first text/email from us soon.');
  }

  function showFormErrors(form) {
    // TODO
  }

  function showAjaxErrors(form, erorr) {
    setFormMessage(form, 'Oops! Something went wrong, please check the form and try again.', true);
  }

  function clearFormMessage(form) {
    var box = $(form).find('.form-message');
    box.text('').addClass('hide');
  }

  function setFormMessage(form, message, isError) {
    var box = $(form).find('.form-message');
    if (isError) {
      box.removeClass('text-success').addClass('text-danger');
    } else {
      box.removeClass('text-danger').addClass('text-success');
    }

    box.text(message).removeClass('hide');

    if (!isError) {
      setTimeout(function () {
        box.slideUp("slow", function () {
          box.addClass('hide').show();
        });
      }, 3000);
    }
  }

  // offline mode and stats
  function setupStatus(selector) {
    var panel = $(selector);
    var form = $('#signup');
    if (panel.length === 0) { return; }

    // Edit rally name
    $('#edit-rally-name').click(function (event) {
      var rallyName = $('#rally-name-set');
      var rallyForm = $('#rally-name-form');

      rallyName.addClass('hide');
      rallyForm.find('input').val("").on('keyup', function (event) {
        if (event.keyCode === 13) {
          setRallyName(event.target.value);

          rallyForm.addClass('hide');
          rallyName.removeClass('hide');
        }
      });
      rallyForm.removeClass('hide');
    });
    setRallyName(localStorage.getItem(STORAGE.RALLY_NAME_KEY));

    // Statistics
    updateStoredCount();
    updateTodayCount();

    // Online and offline control
    $('#go-offline').click(function () { goOffline(form); });
    $('#go-online').click(function () { goOnline(form); });
    updateOnlineStatus();

    // Auto detect offline and auto-switch
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  function updateOnlineStatus() {
    var form = $('#signup');
    if (window.navigator.onLine) {
      if (form.data('offline') === undefined) {
        // We haven't set this yet, let's do it now
        // We do not force online in case the user manually disabled it.
        goOnline(form);
      }
      $('#go-online').attr('disabled', false);
      $('#go-online-disabled').addClass('hide');
    } else {
      goOffline(form);
      $('#go-online').attr('disabled', true);
      $('#go-online-disabled').removeClass('hide');
    }
  }

  function isOffline(form) {
    return !!form.data('offline');
  }

  function goOffline(form) {
    form.data('offline', true);

    $('#status-online').addClass('hide');
    $('#status-offline').removeClass('hide');
  }

  function goOnline(form) {
    form.data('offline', false);

    $('#status-online').removeClass('hide');
    $('#status-offline').addClass('hide');
  }

  function setRallyName(name) {
    if (!name || name.trim() === "") {
      name = "Rally Name";
    }

    $('#rally-name').text(name);
    localStorage.setItem(STORAGE.RALLY_NAME_KEY, name);
  }

  function updateStoredCount() {
    var contactCount = (localStorage.getItem(STORAGE.SAVED_CONTACTS_KEY) || []).length;
    $('#rally-pending').text(contactCount);
  }

  function updateTodayCount() {
    var contacts = localStorage.getItem(STORAGE.SAVED_CONTACTS_KEY) || [];
    var todayCount = contacts.filter(function (contact) {
      // return if contact saved today
      // TODO
      return true;
    }).length;

    $('#rally-num-today').text(todayCount);
  }

  function sendPendingContacts(formTemplate) {
    // Use the passed form as a template to clone, fill data and send
    // On successful send, clear entry from localStorage
    // On error, add to errors store

    // TODO
  }

  function start() {
    setupForm('#signup');
    setupStatus('#status');
  }
  start();

})();
