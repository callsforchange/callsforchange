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
    form.find('input[name=phone]').attr('required', preference === 'sms');
  }

  function submitHandler(event) {
    form = event.target;

    if (!isValid(form)) {
      showFormErrors(form);
      event.preventDefault();
      return;
    }

    // data-offline on form to track
    if (isOffline(form)) {
      // save to localStorage
      form.reset();
      showFormSuccess(form);
      event.preventDefault();
      return;
    }

    // Fall through allows form to send normally
  }

  function apiServer() {
    var location = window.location;
    return location.protocol + '//' + location.host.replace('www.', API_SUBDOMAIN + '.');
  }

  // Form validation
  function isValid(form) {
    // TODO
    return true;
  }

  function showFormSuccess(form) {
    // TODO
  }

  function showFormErrors(form) {
    // TODO
  }

  // offline mode and stats
  function setupStatus(selector) {
    var panel = $(selector);
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
    $('#go-offline').click(goOffline);
    $('#go-online').click(goOnline);
    updateOnlineStatus();

    // Auto detect offline and auto-switch
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  function updateOnlineStatus() {
    if (window.navigator.onLine) {
      if ($('#signup').data('offline') === undefined) {
        // We haven't set this yet, let's do it now
        // We do not force online in case the user manually disabled it.
        goOnline();
      }
      $('#go-online').attr('disabled', false);
      $('#go-online-disabled').addClass('hide');
    } else {
      goOffline();
      $('#go-online').attr('disabled', true);
      $('#go-online-disabled').removeClass('hide');
    }
  }

  function goOffline() {
    var form = $('#signup');
    form.data('offline', true);

    $('#status-online').addClass('hide');
    $('#status-offline').removeClass('hide');
  }

  function goOnline() {
    var form = $('#signup');
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
