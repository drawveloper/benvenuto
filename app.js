(function() {

  require('zappajs')(function() {
    var client, getAllPlaces, getPlace, initializeRedis, layout, partials, redis, routes, setPlace, settings, _u,
      _this = this;
    routes = require('./routes');
    redis = require("redis");
    client = redis.createClient();
    partials = require('express-partials');
    _u = require('underscore');
    layout = {};
    settings = {
      tableRecentTimeMillis: 60000
    };
    initializeRedis = function() {
      return client.get("layout", function(err, reply) {
        var layoutKey, leanLayout, place, places, redisKey, _i, _len, _results;
        if (err) {
          console.log("Erro ao recuperar layout do banco. Usando mapa default.", err);
          layout = (require('./places/newplaces.js')).layout;
          return;
        }
        if (!reply) {
          layout = (require('./places/newplaces.js')).layout;
          leanLayout = {
            gridSizePixels: layout.gridSizePixels,
            name: layout.name,
            id: layout.id
          };
          client.set("layout", JSON.stringify(leanLayout));
          layoutKey = "layout:" + leanLayout.id;
          places = layout.places;
          _results = [];
          for (_i = 0, _len = places.length; _i < _len; _i++) {
            place = places[_i];
            redisKey = "place:" + place.id;
            _results.push(client.hset(layoutKey, redisKey, JSON.stringify(place)));
          }
          return _results;
        } else {
          return layout = JSON.parse(reply);
        }
      });
    };
    getAllPlaces = function(callback) {
      var layoutKey;
      layoutKey = "layout:" + layout.id;
      return client.hgetall(layoutKey, function(err, reply) {
        var key, redisPlaces, value;
        if (err) {
          console.log("Erro ao recuperar lugares do banco.", err);
          callback(void 0);
          return;
        }
        redisPlaces = [];
        for (key in reply) {
          value = reply[key];
          redisPlaces.push(JSON.parse(value));
        }
        console.log("Enviando lugares do REDIS: ", redisPlaces);
        return callback(redisPlaces);
      });
    };
    getPlace = function(id, callback) {
      var fieldKey, layoutKey;
      layoutKey = "layout:" + layout.id;
      fieldKey = "place:" + id;
      return client.hget(layoutKey, fieldKey, function(err, reply) {
        var place;
        if (err) {
          console.log("Erro ao recuperar lugar do banco.", err);
          callback(void 0);
          return;
        }
        place = JSON.parse(reply);
        console.log("Enviando lugar do REDIS: ", place);
        return callback(place);
      });
    };
    setPlace = function(place) {
      var fieldKey, layoutKey;
      layoutKey = "layout:" + layout.id;
      fieldKey = "place:" + place.id;
      return client.hset(layoutKey, fieldKey, JSON.stringify(place));
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
    initializeRedis();
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
        var _this = this;
        return getAllPlaces(function(places) {
          return _this.response.send(places);
        });
      }
    });
    this.get({
      '/livres.json': function() {
        var _this = this;
        return getAllPlaces(function(places) {
          return _this.response.send(_u.chain(places).filter(function(place) {
            return place.occupied === false;
          }).value());
        });
      }
    });
    this.get({
      '/ocupados.json': function() {
        var _this = this;
        return getAllPlaces(function(places) {
          return _this.response.send(_u.chain(places).flatten().filter(function(place) {
            return place.occupied === true;
          }).value());
        });
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
        var _this = this;
        return getAllPlaces(function(places) {
          var data, key, value;
          data = {};
          for (key in layout) {
            value = layout[key];
            data[key] = value;
          }
          data.places = places;
          _this.emit({
            welcome: {
              time: new Date(),
              data: data
            }
          });
          return console.log(layout);
        });
      }
    });
    this.on({
      'occupy': function() {
        var ackSent, occupationDate, occupiedArray, occupiedPlaces, placeId, _i, _len,
          _this = this;
        console.log(this.data);
        occupiedPlaces = this.data.places;
        occupiedArray = [];
        console.log(occupiedPlaces);
        occupationDate = new Date();
        ackSent = false;
        for (_i = 0, _len = occupiedPlaces.length; _i < _len; _i++) {
          placeId = occupiedPlaces[_i];
          getPlace(placeId, function(place) {
            if (ackSent) {
              return;
            }
            if (place.occupied) {
              _this.ack({
                result: 'fail'
              });
              ackSent = true;
              return;
            }
            place.occupied = true;
            place.lastOccupation = occupationDate;
            return setPlace(place);
          });
          occupiedArray.push({
            id: placeId,
            lastOccupation: occupationDate
          });
        }
        if (ackSent) {
          return;
        }
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
        var freeArray, freePlaces, placeId, _i, _len,
          _this = this;
        freePlaces = this.data.places;
        freeArray = [];
        console.log(freePlaces);
        for (_i = 0, _len = freePlaces.length; _i < _len; _i++) {
          placeId = freePlaces[_i];
          getPlace(placeId, function(place) {
            place.occupied = false;
            return setPlace(place);
          });
          freeArray.push({
            id: placeId
          });
        }
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
