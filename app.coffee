require('zappajs') ->
  routes = require './routes'
  redis = require("redis")
  client = redis.createClient()
  partials = require 'express-partials'
  _u = require 'underscore'
  layout = {id:1}
  settings = {tableRecentTimeMillis: 60000}

  layoutKey = (id) -> if id then return "layout:" + id else return "layout:" + layout.id

  placeKey = (id) -> return layoutKey() + ":place:" + id

  placeArrayKeys = (idsArray) -> return _u.map idsArray, (id) -> placeKey(id)

  initializeRedis = ->
    # Pega do banco o layout escolhido atualmente
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
        # Guarde cada lugar como uma key separada
        # E guarde todas as keys num set para recuperar todas
        places = layout.places
        for place in places
          redisKey = placeKey place.id
          client.sadd layoutKey(), redisKey
          client.set redisKey, JSON.stringify place
      # Já existe layout no banco - use ele para essa sessão
      else
        layout = JSON.parse reply

  # Retorna do banco todos os lugares identificados pelos id's presentes em idsArray
  # keysAreStructured indica se as chaves são apenas os ids inteiros ou já contem o namespace.
  getMultiplePlaces = (idsArray, callback, keysAreStructured) ->
    placeKeys = if keysAreStructured then idsArray else placeArrayKeys(idsArray);
    client.mget placeKeys, (err, replies) ->
      if err
        console.log "Erro ao recuperar lugares do banco.", err
        callback(undefined)
        return
      # console.log "Recuperei lugares:", replies
      redisPlaces = []
      for value in replies
        redisPlaces.push JSON.parse value
      # console.log "Enviando lugares do REDIS: ", redisPlaces
      callback(redisPlaces)

  # Retorna todos os lugares do banco
  getAllPlaces = (callback) ->
    client.smembers layoutKey(), (err, replyKeys) ->
      if err
        console.log "Erro ao recuperar lista de places.", err
        callback(undefined)
        return
      # console.log "Resultado de smembers com ", layoutKey(), "foi", replyKeys
      # SMEMBERS já devolve as keys com o namespace apropriado, eg. layout:1:place:2
      keysAreStructured = true
      getMultiplePlaces replyKeys, callback, keysAreStructured

  getPlace = (id, callback) ->
    layoutKey = "layout:" + layout.id
    fieldKey = layoutKey + ":place:" + id
    client.get fieldKey, (err, reply) ->
      if err
        console.log "Erro ao recuperar lugar do banco.", err
        callback(undefined)
        return
      place = JSON.parse reply
      # console.log "Enviando lugar do REDIS: ", place
      callback(place)

  setPlacesMulti = (places, execCallback) ->
    argsArray = []
    for place in places
      fieldKey = placeKey place.id
      argsArray.push fieldKey
      argsArray.push JSON.stringify place
    client.multi().mset(argsArray).exec execCallback

  # Configuration
  @use partials(), 'bodyParser', 'methodOverride', @app.router, @express.static __dirname + '/public'

  @configure
    development: => @use 'errorHandler'
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
    console.log 'Recebido evento occupy', @data
    # occupiedPlacesIds é um array com os id's inteiros de todos os lugares a serem ocupados
    occupiedPlacesIds = @data.places
    lastOccupation = new Date()
    # Watch todas as keys - se qualquer uma delas for alterada, a transação é abortada
    client.watch placeArrayKeys(occupiedPlacesIds)
    getMultiplePlaces occupiedPlacesIds, (places) =>
      console.log places
      alreadyOccupiedPlaces = []
      for place in places
        if place.occupied then alreadyOccupiedPlaces.push(place)
      if alreadyOccupiedPlaces.length > 0
        # Já existem lugares ocupados
        client.unwatch()
        # Avisa a interface quais lugares já estavam ocupados
        @ack {result: 'fail', alreadyOccupiedPlaces: alreadyOccupiedPlaces}
        return

      # Nenhum lugar está ocupado - inicie uma transação com MULTI para ocupar todos
      _u.each places, (p) ->
        p.occupied = true
        p.lastOccupation = lastOccupation
      setPlacesMulti places, (err, replies) =>
        if err or replies is null
          console.log "Erro ao salvar os lugares no banco:", err
          @ack {result: 'fail'}
          return
        # Monta um array somente com o necessario para passar aos outros clientes
        occupiedPlacesArray = _u.map places, (p) -> {id: p.id, lastOccupation: p.lastOccupation}
        @broadcast 'occupy' : {'occupiedPlaces': occupiedPlacesArray}
        @ack result: 'ok'

  @on 'free': ->
    console.log 'Recebido evento occupy', @data
    # freePlacesIds é um array com os id's inteiros de todos os lugares a serem liberados
    freePlacesIds = @data.places
    getMultiplePlaces freePlacesIds, (places) =>
      console.log places
      _u.each places, (p) ->
        p.occupied = false
      setPlacesMulti places, (err, replies) =>
        if err or replies is null
          console.log "Erro ao salvar os lugares no banco:", err
          @ack {result: 'fail'}
          return
        # Monta um array somente com o necessario para passar aos outros clientes
        freePlacesArray = _u.map places, (p) -> {id: p.id}
        @broadcast 'free' : {'freePlaces': freePlacesArray}
        @ack result: 'ok'
