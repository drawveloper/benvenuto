require('zappajs') ->
  routes = require './routes'
  redis = require("redis")
  client = redis.createClient()
  partials = require 'express-partials'
  _u = require 'underscore'
  layout = {}
  settings = {tableRecentTimeMillis: 60000}
  initializeRedis = ->
    # Pegue do banco o layout escolhido atualmente
    client.get "layout", (err, reply) ->
      if err
        console.log "Erro ao recuperar layout do banco. Usando mapa default.", err
        layout = (require './places/newplaces.js').layout
        return
      # Não existe layout - inicialize com o default do arquivo
      if (!reply)
        layout = (require './places/newplaces.js').layout
        # Não guarde os lugares no layout
        leanLayout =
          gridSizePixels: layout.gridSizePixels
          name: layout.name
          id: layout.id
        client.set "layout", JSON.stringify leanLayout
        layoutKey = "layout:" + leanLayout.id
        # Guarde cada lugar como um field do hash cuja key é esse layout
        places = layout.places
        for place in places
          redisKey = "place:" + place.id
          client.hset layoutKey, redisKey, JSON.stringify place
      # Já existe layout no banco - use ele para essa sessão
      else
        layout = JSON.parse reply

  getAllPlaces = (callback) ->
    layoutKey = "layout:" + layout.id
    client.hgetall layoutKey, (err, reply) ->
      if err
        console.log "Erro ao recuperar lugares do banco.", err
        callback(undefined)
        return
      redisPlaces = []
      for key, value of reply
        # console.log value
        redisPlaces.push JSON.parse value
      console.log "Enviando lugares do REDIS: ", redisPlaces
      callback(redisPlaces)

  getPlace = (id, callback) ->
    layoutKey = "layout:" + layout.id
    fieldKey = "place:" + id
    client.hget layoutKey, fieldKey, (err, reply) ->
      if err
        console.log "Erro ao recuperar lugar do banco.", err
        callback(undefined)
        return
      place = JSON.parse reply
      console.log "Enviando lugar do REDIS: ", place
      callback(place)

  setPlace = (place) ->
    layoutKey = "layout:" + layout.id
    fieldKey = "place:" + place.id
    client.hset layoutKey, fieldKey, JSON.stringify place


  # Configuration
  @use partials(), 'bodyParser', 'methodOverride', @app.router, @express.static __dirname + '/public'

  @configure
    development: => @use errorHandler: {dumpExceptions: on}
    production: => @use 'errorHandler'

  @set 'views', __dirname + '/views'
  @set 'view engine', 'ejs'

  # Inicialização
  console.log 'Bem vindo ao Benvenuto!'
  initializeRedis()

  @get '/': -> routes.index @request, @response, settings

  @get '/recepcao': ->
    @render 'reception.ejs'

  @get '/salao': ->
    @render 'blocks.ejs', settings: settings

  @get '/lugares.json': ->
    getAllPlaces (places) =>
      @response.send places

  @get '/livres.json': ->
    getAllPlaces (places) =>
      @response.send _u.chain(places).filter((place) ->
        place.occupied is false
      ).value()

  @get '/ocupados.json': ->
    getAllPlaces (places) =>
      @response.send _u.chain(places).flatten().filter((place) ->
        place.occupied is true
      ).value()

  @post '/config/tempo': ->
    console.log @request.body
    settings.tableRecentTimeMillis = @request.body.time * 1
    @response.send 200

  #Socket IO
  @on 'connection': ->
    getAllPlaces (places) =>
      data = {}
      data[key] = value for key, value of layout
      data.places = places
      @emit welcome: {time: new Date(), data: data}
      console.log layout

  @on 'occupy': ->
    console.log @data
    occupiedPlaces = @data.places
    occupiedArray = []
    console.log occupiedPlaces
    occupationDate = new Date()
    ackSent = false
    # TODO usar promises e esperar todas voltarem para mandar resposta atômica
    for placeId in occupiedPlaces
      getPlace placeId, (place) =>
        if ackSent
          return

        if place.occupied
          @ack result: 'fail'
          ackSent = true
          return

        place.occupied = true
        place.lastOccupation = occupationDate
        # Grava o lugar alterado
        setPlace(place)

      occupiedArray.push {id: placeId, lastOccupation: occupationDate}

    # Foi abortado no meio da operação.
    if ackSent
      return

    @broadcast 'occupy' : {'occupiedPlaces': occupiedArray}
    @ack result: 'ok'

  @on 'free': ->
    freePlaces = @data.places
    freeArray = []
    console.log freePlaces
    # TODO usar promises e esperar todas voltarem para mandar resposta atômica
    for placeId in freePlaces
      getPlace placeId, (place) =>
        place.occupied = false
        # Grava o lugar alterado
        setPlace(place)

      freeArray.push {id: placeId}
    @broadcast 'free' : {'freePlaces': freeArray}
    @ack result: 'ok'
