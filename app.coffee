#
# Dependências
#
express = require 'express'
http = require 'http'
path = require 'path'
app = express()
server = http.createServer(app)
io = require 'socket.io'
io = io.listen(server)
redis = require 'redis'
client = redis.createClient()
_u = require 'underscore'
layout = {id:1}

#
# Configurações do aplicativo
#
settings = {tableRecentTimeMillis: 60000}

app.configure ->
  app.set "port", process.env.PORT or 3000
  app.set "views", __dirname + "/views"
  app.set "view engine", "mmm"
  app.set "layout", "layout"
  app.use express.favicon()
  app.use express.logger("dev")
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use app.router
  app.use express.static(path.join(__dirname, "public"))

app.configure "development", ->
  app.use express.errorHandler()

app.get "/", (req, res) ->
  res.render 'index'

#
# Mapeamento de identificadores
#
layoutKey = (id) -> if id then return "layout:" + id else return "layout:" + layout.id
placeKey = (id) -> return layoutKey() + ":place:" + id
placeArrayKeys = (idsArray) -> return _u.map idsArray, (id) -> placeKey(id)

#
# Acesso ao banco de dados
#
initializeRedis = ->
  # Pega do banco o layout escolhido atualmente
  client.get "layout", (err, reply) ->
    if err
      console.log "Erro ao recuperar layout do banco. Usando mapa default.", err
      layout = (require './public/js/newplaces.js').layout
      return
    # Não existe layout - inicialize com o default do arquivo
    if (!reply)
      console.log "Inicializando banco com dados do arquivo."
      layout = (require './public/js/newplaces.js').layout
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
      console.log "Banco OK."
      layout = JSON.parse reply

# Retorna do banco todos os lugares identificados pelos id's presentes em idsArray
# keysAreStructured indica se as chaves são apenas os ids inteiros ou já contem o namespace.
getMultiplePlaces = (idsArray, callback, keysAreStructured) ->
  #console.log 'getMultiplePlaces sendo chamado com', idsArray, keysAreStructured
  placeKeys = if keysAreStructured then idsArray else placeArrayKeys(idsArray);
  client.mget placeKeys, (err, replies) ->
    if err
      console.log "Erro ao recuperar lugares do banco.", err
      callback(undefined)
      return
    # console.log "Recuperei lugares:", replies
    redisPlaces = []
    #console.log 'getMultiplePlaces recebeu', replies,'length', replies.length
    for value in replies
      placeObj = JSON.parse value
      redisPlaces.push placeObj
    #console.log "Enviando lugares do REDIS: ", redisPlaces, 'length', redisPlaces.length
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

#
# Rotas
#
app.get '/', (req, res) ->
  res.render 'index', settings

app.get '/recepcao', (req, res) ->
  res.render 'reception'

app.get '/salao', (req, res) ->
  res.render 'blocks', settings

app.get '/lugares.json', (req, res) ->
  getAllPlaces (places) =>
    res.send places

app.get '/livres.json', (req, res) ->
  getAllPlaces (places) =>
    res.send _u.chain(places).filter((place) ->
      place.occupied is false
    ).value()

app.get '/ocupados.json', (req, res) ->
  getAllPlaces (places) =>
    res.send _u.chain(places).flatten().filter((place) ->
      place.occupied is true
    ).value()

app.post '/config/tempo', (req, res) ->
  console.log app.request.body
  settings.tableRecentTimeMillis = app.request.body.time * 1
  res.send 200

#
# SocketIO
#
io.sockets.on 'connection', (socket) ->
  console.log 'Iniciando conexão', socket
  getAllPlaces (places) =>
    data = {}
    data[key] = value for key, value of layout
    data.places = places
    socket.emit 'welcome', {time: new Date(), data: data}
    console.log layout

  socket.on 'occupy', (data, ack) ->
    console.log 'Recebido evento occupy', data
    # occupiedPlacesIds é um array com os id's inteiros de todos os lugares a serem ocupados
    occupiedPlacesIds = data.places

    # Ignore mensagens com array vazio de ids
    if occupiedPlacesIds.length is 0
      ack result: 'ok'
      return

    lastOccupation = new Date()
    # Watch todas as keys - se qualquer uma delas for alterada, a transação é abortada
    client.watch placeArrayKeys(occupiedPlacesIds)
    getMultiplePlaces occupiedPlacesIds, (places) =>
      alreadyOccupiedPlaces = []
      for place in places
        if place.occupied then alreadyOccupiedPlaces.push(place)
      if alreadyOccupiedPlaces.length > 0
        # Já existem lugares ocupados
        client.unwatch()
        # Avisa a interface quais lugares já estavam ocupados
        ack {result: 'fail', alreadyOccupiedPlaces: alreadyOccupiedPlaces}
        return

      # Nenhum lugar está ocupado - inicie uma transação com MULTI para ocupar todos
      _u.each places, (p) ->
        p.occupied = true
        p.lastOccupation = lastOccupation
      setPlacesMulti places, (err, replies) =>
        if err or replies is null
          console.log "Erro ao salvar os lugares no banco:", err
          ack {result: 'fail'}
          return
        # Monta um array somente com o necessario para passar aos outros clientes
        occupiedPlacesArray = _u.map places, (p) -> {id: p.id, lastOccupation: p.lastOccupation}
        socket.broadcast.emit 'occupy', {'occupiedPlaces': occupiedPlacesArray}
        ack result: 'ok'

  socket.on 'free', (data, ack) ->
    console.log 'Recebido evento occupy', data
    # freePlacesIds é um array com os id's inteiros de todos os lugares a serem liberados
    freePlacesIds = data.places

    # Ignore mensagens com array vazio de ids
    if freePlacesIds.length is 0
      ack result: 'ok'
      return

    getMultiplePlaces freePlacesIds, (places) =>
      _u.each places, (p) ->
        p.occupied = false
      setPlacesMulti places, (err, replies) =>
        if err or replies is null
          console.log "Erro ao salvar os lugares no banco:", err
          ack {result: 'fail'}
          return
        # Monta um array somente com o necessario para passar aos outros clientes
        freePlacesArray = _u.map places, (p) -> {id: p.id}
        socket.broadcast.emit 'free', {'freePlaces': freePlacesArray}
        ack result: 'ok'

#
# Inicia servidor
#
server.listen app.get("port"), ->
  initializeRedis()
  console.log "Benvenuto - Express server listening on port " + app.get("port")
  console.log 'Bem vindo ao Benvenuto!'