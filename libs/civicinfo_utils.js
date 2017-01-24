var civicinfo = require('./google').civicinfo('v2');

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
  
  removeEmptyStringElements: removeEmptyStringElements,


  normalizePhoneNumber: function normalizePhoneNumber(number) {
    var normalized;
    if (Array.isArray(number)) {
      normalized = number[0];
    } else if(number === undefined) {
      normalized = '';
    } else {
      normalized = number;
    }
    normalized = normalized.replace(/\D/g,'');

    if (normalized.length !== 10) {
      console.log(`Unknown phone format '${number}' normalized to '${normalized}'!`);
      return '';
    } else {
      return normalized.substr(0,3) + '-' + normalized.substr(3,3) + '-' + normalized.substr(6,4);
    }
  },

  representativeProcessing: function(data) {
    const district = data.offices
      .filter(o => o.roles.indexOf('legislatorLowerBody') >= 0)
      .map(o => o.name)
      .filter(name => name.match(/[A-Z]{2}-\d\d?$/))
      .map(name => name.match(/[A-Z]{2}-\d\d?$/)[0])[0];

    const house_index = data.offices
      .filter(o => o.roles.indexOf('legislatorLowerBody') >= 0)
      .map(o => o.officialIndices[0])[0];

    const senate_indices = data.offices
      .filter(o => o.roles.indexOf('legislatorUpperBody') >= 0)
      .map(o => o.officialIndices)[0];

    const official_1 = data.officials[senate_indices[0]];
    const official_2 = data.officials[senate_indices[1]];


    return {
      district: district,
      representative: data.officials[house_index],
      senators: [official_1, official_2]
    };
  }
};
