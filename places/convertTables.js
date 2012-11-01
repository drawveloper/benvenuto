(function() {
  var flatPlaces, places, placesC, _u;

  placesC = require('./places.js');

  _u = require('underscore');

  places = placesC.collection;

  flatPlaces = function() {
    return _u.chain(places.tables).map(function(table) {
      var place, _i, _len, _ref;
      _ref = table.places;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        place = _ref[_i];
        place.tableId = table.id;
        place.tableX = table.x;
        place.tableY = table.y;
        place.tableClass = table._class;
      }
      return table.places;
    }).flatten().value();
  };

  places.places = flatPlaces();

  places.tables = void 0;

  console.log(places);

}).call(this);
