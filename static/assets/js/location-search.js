import Complete from '@firstandthird/complete';

class LocationSearch extends Complete {
  preInit() {
    window.initAutocomplete = () => {
      this.loaded = true;
      this.service = new window.google.maps.places.AutocompleteService();
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.options.apikey}&libraries=places&&callback=initAutocomplete`
    document.head.appendChild(script);
  }
  fetch() {
    console.log('searching');
    if (!this.service) {
      return;
    }
    this.service.getQueryPredictions({ input: this.term }, (results) => {
      const addresses = results.map((result) => ({ 
        name: result.description, 
        value: result.description 
      }));
      this.render(addresses);
    });
  }
}

Complete.register('LocationSearch', LocationSearch);
