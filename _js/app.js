$(document).ready(function() {

  var UI = { // NOTE: Key UI values to keep track of
    map: '',  // the one and only map object
    mapStyle: [ // styling the map object
      {"featureType":"all","elementType":"geometry.fill","stylers":[{"weight":"2.00"}]},
      {"featureType":"all","elementType":"geometry.stroke","stylers":[{"color":"#9c9c9c"}]},
      {"featureType":"all","elementType":"labels.text","stylers":[{"visibility":"on"}]},
      {"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},
      {"featureType":"landscape","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
      {"featureType":"landscape.man_made","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},
      {"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},
      {"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},
      {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#eeeeee"}]},
      {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#7b7b7b"}]},
      {"featureType":"road","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"}]},
      {"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},
      {"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
      {"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},
      {"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"on"}]},
      {"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#C7E2FF"}]},
      {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#070707"}]},
      {"featureType":"water","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"}]}
    ],
    view: 'map', // toggle between 'map', 'load', 'search' or 'info' views. Default is 'map'.
    userMarkerSet: [], // Markers based on search results or user location.
    dataMarkerSet: [], // Markers based on data feed
    initialPos: {lat: 40.7825213, lng: -73.9572029}, // Default map center
    initialZoom: 14,
    currentFeed: 'wifi', // Default data feed at first load
    activeInfoWindow: { alreadyOpen: false, newWindow: '' }, // Keep track of open infoWindow object to close it when a new one opens
    icons: { // Marker icons per data type
      user: {
        url: "../images/user.svg",
        scaledSize: new google.maps.Size(40,60),
        anchor: new google.maps.Point(20, 60),
      },
      wifi: {
        url: "../images/wifi_marker.svg",
        scaledSize: new google.maps.Size(36,36),
        anchor: new google.maps.Point(18, 18)
      },
      subway: {
        url: "../images/subway_marker.svg",
        scaledSize: new google.maps.Size(36,36),
        anchor: new google.maps.Point(18, 18)
      },
      restroom: {
        url: "../images/toilet_marker.svg",
        scaledSize: new google.maps.Size(36,36),
        anchor: new google.maps.Point(18, 18)
      }
    },
    input: document.getElementById('searchBox') // DOM element for searchBox input
  };

  var Utils = { // NOTE: Miscellaneous methods
    getInfoMarkup: function(source, content) {
      var infoString;
      switch (source) {
        case 'wifi':
          infoString =
            '<div class="infoBlock">' +
              '<h3 class="infoTitle">' + content.location + '</h3>' +
              '<h4 class="infoSubhead">Location Type:</h4>' +
              '<span class="infoDetail">' + content.location_t + '</span>' +
              '<h4 class="infoSubhead">SSID:</h4>' +
              '<span class="infoDetail">' + content.ssid + '</span>' +
            '</div>';
          break;
        case 'subway':
          infoString =
            '<div class="infoBlock">' +
              '<h3 class="infoTitle">' + content.name + '</h3>' +
              '<h4 class="infoSubhead">Lines:</h4>' +
              '<span class="infoDetail">' + content.line + '</span>' +
            '</div>';
          break;
        case 'restroom':
          infoString =
            '<div class="infoBlock">' +
              '<h3 class="infoTitle">' + content.name + '</h3>' +
              '<span class="infoDetail">' + content.address + '</span>' +
              '<h4 class="infoSubhead">Category:</h4>' +
              '<span class="infoDetail">' + content.category + '</span>' +
              '<h4 class="infoSubhead">Hours:</h4>' +
              '<span class="infoDetail">' + content.hours + '</span>' +
              '<h4 class="infoSubhead">Accessible:</h4>' +
              '<span class="infoDetail">' + content.accessible + '</span>' +
            '</div>';
          break;
        default:
          break;
      }
      return infoString;
    },
    localStorageAvailable: function() {
      // NOTE: Method referenced from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
      try {
        var storage = window.localStorage,
          x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
      }
      catch(e) {
        return false;
      }
    }
  };

  var SOURCES = [ // NOTE: NYC Open Data API doesn't requre authentication
    {
      name: 'wifi',
      url: "https://data.cityofnewyork.us/api/geospatial/a9we-mtpn?method=export&format=GeoJSON",
      formatResponse: function(response) {
        return _.map(response.features, function(location){
          var lat = Number(location.properties.lat);
          var lon = Number(location.properties.lon);
          var infoContent = Utils.getInfoMarkup('wifi', location.properties);
          var infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            size: new google.maps.Size(200,50)
          });
          var marker = new google.maps.Marker({
            position: {lat: lat, lng: lon},
            map: UI.map,
            icon: UI.icons.wifi
          });
          UI.dataMarkerSet.push(marker);
          return { marker: marker, infoWindow: infoWindow };
        });
      },
    },
    {
      name: 'subway',
      url: "https://data.cityofnewyork.us/api/geospatial/drex-xx56?method=export&format=GeoJSON",
      formatResponse: function(response) {
        return _.map(response.features, function(location){
          var lat = Number(location.geometry.coordinates[1]);
          var lon = Number(location.geometry.coordinates[0]);
          var infoContent = Utils.getInfoMarkup('subway', location.properties);
          var infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            size: new google.maps.Size(200,50)
          });
          var marker = new google.maps.Marker({
            position: {lat: lat, lng: lon},
            map: UI.map,
            icon: UI.icons.subway
          });
          UI.dataMarkerSet.push(marker);
          return { marker: marker, infoWindow: infoWindow };
        });
      }
    },
    {
      name: 'restroom',
      // NOTE: NYC Open Data for restroom info is clumsy and incomplete.
      // Instead, a hand-crafted data set is used here. I have collected the data
      // online from a few sources, combed through and geocoded, and converted into JSON.
      url: "../_data/nyc_restrooms.json",
      formatResponse: function(response) {
        return _.map(response, function(location){
          var lat = Number(location.latitude);
          var lon = Number(location.longitude);
          var infoContent = Utils.getInfoMarkup('restroom', location);
          var infoWindow = new google.maps.InfoWindow({
            content: infoContent,
            size: new google.maps.Size(200,50)
          });
          var marker = new google.maps.Marker({
            position: {lat: lat, lng: lon},
            map: UI.map,
            icon: UI.icons.restroom
          });
          UI.dataMarkerSet.push(marker);
          return { marker: marker, infoWindow: infoWindow };
        });
      }
    }
  ];

  var App = {
    init: function() {
      this.initMap();
      this.bindEvents();
      this.loadDefaultFeed();
    },
    initMap: function () {
      UI.map = new google.maps.Map(document.getElementById('map'), {
        center: UI.initialPos,
        zoom: UI.initialZoom,
        styles: UI.mapStyle
      });
    },
    loadDefaultFeed: function() {
      UI.map.panTo(UI.initialPos);
      UI.map.setZoom(UI.initialZoom);
      this.markCurrentNav($('li#wifi')[0]); // NOTE: converting jQuery object to DOM object
      this.createMarkers(SOURCES[0]);
    },
    bindEvents: function() {
      // NOTE: binding each callback for 'this' keyword context
      $('nav').on('click', this.changeSelection.bind(this));
      $('#currentLoc').on('click', this.findCurrentLocation.bind(this));
      $('#searchIcon').on('click', this.startSearch.bind(this));
      $('.logo').on('click', this.loadDefaultFeed.bind(this));
      $('#cancel').on('click', this.cancelSearch.bind(this));
      $('#info').on('click', this.showAppInfo.bind(this));
      $('button#find').on('click', this.searchButtonClicked.bind(this));
    },
    markCurrentNav: function(currentNav) {
      // NOTE: Update nav buttons per user selection
      $('nav ul li').removeClass('selected');
      $(currentNav).addClass('selected');
    },
    changeSelection: function(e) {
      var currentNav = e.target;
      UI.currentFeed = currentNav.id;
      var feed = _.findWhere(SOURCES, {name: UI.currentFeed});
      this.createMarkers(feed);
      this.markCurrentNav(currentNav);
    },
    requestData: function(feed) {
      var url = feed.url;
      return $.ajax(url, {
        dataType: 'json'
      });
    },
    createMarkers: function(feed) {
      var _this = this;
      var markersToShow;
      _this.setView('load');
      _this.removeDataMakrerSet(); // Remove any exising markers on the map

      if (Utils.localStorageAvailable && localStorage[feed.name]) {
        // if localStorage is available and not empty, access local data.
        this.fetchLocalStorageData(feed);
      } else {
        // otherwise, fetch server data
        this.fetchRemoteData(feed);
      }
    },
    fetchRemoteData: function (feed) {
      console.log('fetching remote');
      var _this = this;
      var request = _this.requestData(feed);
      request.done(function(response) {
        localStorage.setItem(feed.name, JSON.stringify(response)); // store data locally into localStorage
        var newMarkers = feed.formatResponse(response);
        newMarkers.forEach(function(item) {
          google.maps.event.addListener(item.marker, 'click', function() {
            if (UI.activeInfoWindow.alreadyOpen) {
              UI.activeInfoWindow.newWindow.close();
            } else { UI.activeInfoWindow.alreadyOpen = true; }
            item.infoWindow.open(UI.map, item.marker);
            UI.activeInfoWindow.newWindow = item.infoWindow;
          });
        });
        _this.setView('map');
      });
      request.fail(function(){
        alert("Error occurred. Couldn't load requested data. Try again later.");
        _this.setView('map');
      });
    },
    fetchLocalStorageData: function(feed) {
      console.log('fetching local');
      var retrievedData = localStorage.getItem(feed.name); // This is a JSON object
      var parsedData = JSON.parse(retrievedData);
      var retrievedMarkers = feed.formatResponse(parsedData);
      retrievedMarkers.forEach(function(item) {
        google.maps.event.addListener(item.marker, 'click', function() {
          if (UI.activeInfoWindow.alreadyOpen) {
            UI.activeInfoWindow.newWindow.close();
          } else { UI.activeInfoWindow.alreadyOpen = true; }
          item.infoWindow.open(UI.map, item.marker);
          UI.activeInfoWindow.newWindow = item.infoWindow;
        });
      });
      this.setView('map');
    },
    findCurrentLocation: function() {
      var _this = this;
      _this.setView('load');
      var success = function(position) {
        var userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        _this.removeUserMarkerSet();
        _this.redrawMap(userLocation);
      };
      var error = function() {
        alert("Error occurred. Couldn't find your current location.");
        _this.setView('map');
      };
      navigator.geolocation.getCurrentPosition(success, error);
    },
    showAppInfo: function() {
      this.setView('info');
    },
    addUserMarkerSet: function(userLocation) {
      var marker = new google.maps.Marker({
        position: userLocation,
        map: UI.map,
        icon: UI.icons.user
      });
      UI.userMarkerSet.push(marker);
    },
    removeUserMarkerSet: function() {
      if (UI.userMarkerSet.length !== 0) {
        UI.userMarkerSet.forEach(function(marker) {
          marker.setMap(null);
          console.log('dele');
        });
        UI.userMarkerSet = [];
      }
    },
    removeDataMakrerSet: function() {
      UI.dataMarkerSet.forEach(function(marker){
        marker.setMap(null);
      });
      UI.dataMarkerSet = [];
    },
    startSearch: function() {
      var _this = this;
      this.setView('search');
      $('#searchBox, button#find').show();
      $(UI.input).val('');
      var search = new google.maps.places.SearchBox(UI.input);
      UI.map.addListener('bounds_changed', function () { // Bias the search results toward map's viewport
        search.setBounds(UI.map.getBounds());
      });
      search.addListener('places_changed', function() { // triggering Google's autocomplete search
        var places = search.getPlaces();
        if (places.length === 0 ) {
          return;
        } else {
          _this.removeUserMarkerSet();
          places.forEach(function(place) {
            _this.redrawMap(place.geometry.location);
          });
        }
      });
    },
    searchButtonClicked: function() {
      var _this = this;
      var searchQuery = UI.input.value;
      var q = {'address': searchQuery};
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode(q, function (data) {
        if (data.length === 0) {
          return;
        }
        _this.removeUserMarkerSet();
        _this.redrawMap(data[0].geometry.location);
      });
    },
    cancelSearch: function() {
      this.setView('map');
    },
    redrawMap: function(location) {
      this.setView('map');
      this.addUserMarkerSet(location);
      UI.map.panTo(location);
      UI.map.setZoom(16);

    },
    setView: function(view) {
      switch(view) {
        case 'map':
          $('#popUp').addClass('hidden');
          $('#popUp').removeClass('loader');
          $('.searchContainer').hide();
          break;
        case 'load':
          $('#popUp').removeClass('hidden');
          $('#popUp').addClass('loader');
          $('.searchContainer').hide();
          $('#infoBox').hide();
          break;
        case 'search':
          $('#popUp').removeClass('hidden');
          $('#popUp').removeClass('loader');
          $('.searchContainer').show();
          $('#searchBox, button#find').show();
          $('#infoBox').hide();
          break;
        case 'info':
          $('#popUp').removeClass('hidden');
          $('#popUp').removeClass('loader');
          $('.searchContainer').show();
          $('#searchBox, button#find').hide();
          $('#infoBox').show();
          break;
        default:
          break;
      }
    }
  };

  App.init();

});
