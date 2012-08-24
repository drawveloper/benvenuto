require('zappajs') ->
  routes = require './routes'
  partials = require 'express-partials'
  placesC = require './places/places.js'
  _u = require 'underscore'
  places = placesC.collection
  flatPlaces = ->
    _u.chain(places.tables).map(
      (table) -> table.places
    ).flatten().value()

## Configuration

  @use partials(), 'bodyParser', 'methodOverride', @app.router, @express.static __dirname + '/public'

  @configure
    development: => @use errorHandler: {dumpExceptions: on}
    production: => @use 'errorHandler'

  @set 'views', __dirname + '/views'
  @set 'view engine', 'ejs'

  @get '/': -> routes.index @request, @response, {selectedHall: 'HALL_1', tableRecentTimeMillis: 60000}

  @get '/recepcao': ->
    @render 'reception.ejs'

  @get '/salao1': ->
    @render 'blocks.ejs'

  @get '/lugares.json': ->
    @response.send places

  @get '/livres.json': ->
    @response.send _u.chain(flatPlaces()).filter((place) ->
      place.occupied is false
    ).value()

  @get '/ocupados.json': ->
    @response.send _u.chain(flatPlaces()).flatten().filter((place) ->
      place.occupied is true
    ).value()

    #Socket IO
  @on 'connection': ->
    @emit welcome: {time: new Date(), data: places}

  @on 'occupy': ->
    console.log @data
    occupiedPlaces = @data.places
    occupiedArray = []
    console.log occupiedPlaces
    _u.each occupiedPlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = true
      place.lastOccupation = new Date()
      occupiedArray.push {id: place.id, lastOccupation: place.lastOccupation}
    @broadcast 'occupy' : {'occupiedPlaces': occupiedArray}
    @ack result: 'ok'

  @on 'free': ->
    freePlaces = @data.places
    freeArray = []
    console.log freePlaces
    _u.each freePlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = false
      freeArray.push {id: place.id}
    @broadcast 'free' : {'freePlaces': freeArray}
    @ack result: 'ok'
