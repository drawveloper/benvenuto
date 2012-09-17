(function() {

  require('zappajs')(function() {
    var client, layout, partials, places, redis, routes, settings, _u,
      _this = this;
    routes = require('./routes');
    redis = require("redis");
    client = redis.createClient();
    partials = require('express-partials');
    _u = require('underscore');
    layout = (require('./places/newplaces.js')).layout;
    places = layout.places;
    settings = {
      tableRecentTimeMillis: 60000
    };
    this.use(partials(), 'bodyParser', 'methodOverride', this.app.router, this.express["static"](__dirname + '/public'));
    this.configure({
      development: function() {
        return _this.use({
          errorHandler: {
            dumpExceptions: true
          }
        });
      },
      production: function() {
        return _this.use('errorHandler');
      }
    });
    this.set('views', __dirname + '/views');
    this.set('view engine', 'ejs');
    console.log('Bem vindo ao Benvenuto!');
    client.get("places", function(err, reply) {
      if (!reply) {
        return client.set("places", places);
      }
    });
    this.get({
      '/': function() {
        return routes.index(this.request, this.response, settings);
      }
    });
    this.get({
      '/recepcao': function() {
        return this.render('reception.ejs');
      }
    });
    this.get({
      '/salao': function() {
        return this.render('blocks.ejs', {
          settings: settings
        });
      }
    });
    this.get({
      '/lugares.json': function() {
        return this.response.send(places);
      }
    });
    this.get({
      '/livres.json': function() {
        return this.response.send(_u.chain(places).filter(function(place) {
          return place.occupied === false;
        }).value());
      }
    });
    this.get({
      '/ocupados.json': function() {
        return this.response.send(_u.chain(places).flatten().filter(function(place) {
          return place.occupied === true;
        }).value());
      }
    });
    this.post({
      '/config/tempo': function() {
        console.log(this.request.body);
        settings.tableRecentTimeMillis = this.request.body.time * 1;
        return this.response.send(200);
      }
    });
    this.on({
      'connection': function() {
        return this.emit({
          welcome: {
            time: new Date(),
            data: layout
          }
        });
      }
    });
    this.on({
      'occupy': function() {
        var occupiedArray, occupiedPlaces;
        console.log(this.data);
        occupiedPlaces = this.data.places;
        occupiedArray = [];
        console.log(occupiedPlaces);
        _u.each(occupiedPlaces, function(id) {
          var place;
          place = _u.find(places, function(place) {
            return place.id * 1 === id * 1;
          });
          place.occupied = true;
          place.lastOccupation = new Date();
          return occupiedArray.push({
            id: place.id,
            lastOccupation: place.lastOccupation
          });
        });
        this.broadcast({
          'occupy': {
            'occupiedPlaces': occupiedArray
          }
        });
        return this.ack({
          result: 'ok'
        });
      }
    });
    return this.on({
      'free': function() {
        var freeArray, freePlaces;
        freePlaces = this.data.places;
        freeArray = [];
        console.log(freePlaces);
        _u.each(freePlaces, function(id) {
          var place;
          place = _u.find(places, function(place) {
            return place.id * 1 === id * 1;
          });
          place.occupied = false;
          return freeArray.push({
            id: place.id
          });
        });
        this.broadcast({
          'free': {
            'freePlaces': freeArray
          }
        });
        return this.ack({
          result: 'ok'
        });
      }
    });
  });

}).call(this);
