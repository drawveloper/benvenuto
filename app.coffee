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

  @get '/': -> routes.index @request, @response

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
    console.log occupiedPlaces
    _u.each occupiedPlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = true
    @broadcast 'occupy' : {occupiedPlaces}
    @ack result: 'ok'

  @on 'free': ->
    freePlaces = @data.places
    console.log freePlaces
    _u.each freePlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = false
    @broadcast 'free' : {freePlaces}
    @ack result: 'ok'
