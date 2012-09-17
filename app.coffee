require('zappajs') ->
  routes = require './routes'
  redis = require("redis")
  client = redis.createClient()
  partials = require 'express-partials'
  _u = require 'underscore'
  layout = (require './places/newplaces.js').layout
  places = layout.places
  settings = {tableRecentTimeMillis: 60000}

## Configuration

  @use partials(), 'bodyParser', 'methodOverride', @app.router, @express.static __dirname + '/public'

  @configure
    development: => @use errorHandler: {dumpExceptions: on}
    production: => @use 'errorHandler'

  @set 'views', __dirname + '/views'
  @set 'view engine', 'ejs'

  ##Inicialização
  console.log 'Bem vindo ao Benvenuto!'
  client.get "places", (err, reply) ->
    if (!reply)
      client.set "places", places

  @get '/': -> routes.index @request, @response, settings

  @get '/recepcao': ->
    @render 'reception.ejs'

  @get '/salao': ->
    @render 'blocks.ejs', settings: settings

  @get '/lugares.json': ->
    @response.send places

  @get '/livres.json': ->
    @response.send _u.chain(places).filter((place) ->
      place.occupied is false
    ).value()

  @get '/ocupados.json': ->
    @response.send _u.chain(places).flatten().filter((place) ->
      place.occupied is true
    ).value()

  @post '/config/tempo': ->
    console.log @request.body
    settings.tableRecentTimeMillis = @request.body.time * 1
    @response.send 200

  #Socket IO
  @on 'connection': ->
    @emit welcome: {time: new Date(), data: layout}

  @on 'occupy': ->
    console.log @data
    occupiedPlaces = @data.places
    occupiedArray = []
    console.log occupiedPlaces
    _u.each occupiedPlaces, (id) ->
      place = _u.find(places, (place) ->
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
      place = _u.find(places, (place) ->
        place.id * 1 is id * 1
      )
      place.occupied = false
      freeArray.push {id: place.id}
    @broadcast 'free' : {'freePlaces': freeArray}
    @ack result: 'ok'
