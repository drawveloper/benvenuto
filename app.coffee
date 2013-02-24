#
# Dependências
#
express = require 'express'
http = require 'http'
path = require 'path'
socketio = require 'socket.io'
_u = require 'underscore'

require 'coffee-script'
# Configurações do aplicativo
settings = require('./libs/settings.coffee')
Persistence = require('./libs/persistence.coffee')

app = express()
server = http.createServer(app)
io = socketio.listen(server)
io.set('log level', 1)
p = new Persistence({id:1})

app.configure ->
  app.set "port", process.env.PORT or 3000
  app.set "views", __dirname + "/views"
  app.set "view engine", "mmm"
  app.set "layout", "layout"
  app.use express.favicon(path.join(__dirname, "public/favicon.ico"))
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use app.router
  app.use express['static'](path.join(__dirname, "public"))

app.configure "development", ->
  app.use express.errorHandler()

#
# Rotas
#
app.get '/', (req, res) ->
  res.render 'index', settings

app.get '/recepcao', (req, res) ->
  res.render 'reception'

app.get '/salao', (req, res) ->
  blockSettings = _u.clone(settings)

  for option in blockSettings.tableRecentOptions
    blockSettings.selectedTableRecentMillis = option.value if option.selected

  res.render 'hall', blockSettings

app.get '/relatorios', (req, res) ->
  res.render 'reports'

app.get '/relatorio1.json', (req, res) ->
  p.getOccupationLogs 2012, 11, (data) ->
    res.send {views: data}

app.get '/relatorio/:year-:month.json', (req, res) ->
  p.getOccupationLogs req.params.year, req.params.month, (err, data) ->
    if err
      res.send(500)
    else
      res.send {views: data}

app.get '/lugares.json', (req, res) ->
  p.getAllPlaces (places) =>
    res.send places

app.get '/livres.json', (req, res) ->
  p.getAllPlaces (places) =>
    res.send _u.chain(places).filter((place) ->
      place.occupied is false
    ).value()

app.get '/ocupados.json', (req, res) ->
  p.getAllPlaces (places) =>
    res.send _u.chain(places).flatten().filter((place) ->
      place.occupied is true
    ).value()

app.post '/config/tempo', (req, res) ->
  console.log req.body
  tableRecentTimeMillis = req.body.time * 1
  _u.each settings.tableRecentOptions, (option) ->
    if option.value is tableRecentTimeMillis
      option.selected = true
    else
      option.selected = false
  res.send 200

#
# SocketIO
#
io.sockets.on 'connection', (socket) ->
  p.getAllPlaces (places) =>
    data = {}
    data[key] = value for key, value of p.layout
    data.places = places
    console.log 'Enviando welcome para', socket.id
    socket.emit 'welcome', {time: new Date(), data: data}

  socket.on 'occupy', (data, ack) ->
    console.log 'Recebido evento occupy', data, 'de', socket.id
    # occupiedPlacesIds é um array com os id's inteiros de todos os lugares a serem ocupados
    occupiedPlacesIds = data.places

    # Ignore mensagens com array vazio de ids
    if occupiedPlacesIds.length is 0
      ack result: 'ok'
      return

    lastOccupation = new Date()
    data.occupyDate = lastOccupation

    p.logOccupation(data)

    # Watch todas as keys - se qualquer uma delas for alterada, a transação é abortada
    p.watch p.placeArrayKeys(occupiedPlacesIds)
    p.getMultiplePlaces occupiedPlacesIds, (places) =>
      alreadyOccupiedPlaces = []
      for place in places
        if place.occupied then alreadyOccupiedPlaces.push(place)
      if alreadyOccupiedPlaces.length > 0
        # Já existem lugares ocupados
        p.unwatch()
        # Avisa a interface quais lugares já estavam ocupados
        ack {result: 'fail', alreadyOccupiedPlaces: alreadyOccupiedPlaces}
        return

      # Nenhum lugar está ocupado - inicie uma transação com MULTI para ocupar todos
      _u.each places, (p) ->
        p.occupied = true
        p.lastOccupation = lastOccupation
      p.setPlacesMulti places, (err, replies) =>
        if err or replies is null
          console.log "Erro ao salvar os lugares no banco:", err
          ack {result: 'fail'}
          return
        # Monta um array somente com o necessario para passar aos outros clientes
        occupiedPlacesArray = _u.map places, (p) -> {id: p.id, lastOccupation: p.lastOccupation}
        socket.broadcast.emit 'occupy', {'occupiedPlaces': occupiedPlacesArray}
        ack result: 'ok'

  socket.on 'free', (data, ack) ->
    console.log 'Recebido evento free', data, 'de', socket.id
    # freePlacesIds é um array com os id's inteiros de todos os lugares a serem liberados
    freePlacesIds = data.places

    # Ignore mensagens com array vazio de ids
    if freePlacesIds.length is 0
      ack result: 'ok'
      return

    p.getMultiplePlaces freePlacesIds, (places) =>
      _u.each places, (p) ->
        p.occupied = false
      p.setPlacesMulti places, (err, replies) =>
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
  p.initializeRedis()
  console.log "Benvenuto - Express server listening on port " + app.get("port")
  console.log 'Bem vindo ao Benvenuto!'