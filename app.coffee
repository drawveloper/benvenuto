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

  @post '/ocupar': ->
    occupiedPlaces = @request.param('places', 'null')
    console.log occupiedPlaces
    _u.each occupiedPlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = true

    @response.send 'ok'

  @post '/liberar': ->
    freePlaces = @request.param('places', 'null')
    console.log freePlaces
    _u.each freePlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = false

    @response.send 'ok'


    #Socket IO
  @on 'connection': ->
    @emit welcome: {time: new Date()}

  @on 'occupy': ->
    console.log @data
    occupiedPlaces = @data.places
    console.log occupiedPlaces
    _u.each occupiedPlaces, (id) ->
      place = _u.find(flatPlaces(), (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = true
    @ack result: 'ok'
