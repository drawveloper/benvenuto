redis = require 'redis'
_u = require 'underscore'
moment = require 'moment'
require 'coffee-script'
Occupation = require('../models/occupation.coffee').Occupation
Q = require 'q'

class Persistence
  constructor: (@layout) ->
    @client = redis.createClient()

  #
  # Mapeamento de identificadores
  #
  layoutKey: (id) => if id then return "layout:" + id else return "layout:" + @layout.id
  placeKey: (id) => return @layoutKey() + ":place:" + id
  placeLogKey: (id) => return @layoutKey() + ":place:" + id + ":log"
  placeArrayKeys: (idsArray) => return _u.map idsArray, (id) => @placeKey(id)
  watch: (array) => @client.watch array
  unwatch: => @client.unwatch()

  #
  # Acesso ao banco de dados
  #
  initializeRedis: =>
    # Pega do banco o layout escolhido atualmente
    @client.get "layout", (err, reply) =>
      if err
        console.log "Erro ao recuperar layout do banco. Usando mapa default.", err
        @layout = (require '../public/js/newplaces.js').layout
        return
      # Não existe layout - inicialize com o default do arquivo
      if (!reply)
        console.log "Inicializando banco com dados do arquivo."
        @layout = (require '../public/js/newplaces.js').layout
        # Não guarde os lugares no layout
        leanLayout =
          gridSizePixels: @layout.gridSizePixels
          name: @layout.name
          id: @layout.id
        @client.set "layout", JSON.stringify leanLayout
        # Guarde cada lugar como uma key separada
        # E guarde todas as keys num set para recuperar todas
        places = @layout.places
        for place in places
          redisKey = @placeKey place.id
          @client.sadd @layoutKey(), redisKey
          @client.set redisKey, JSON.stringify place
        # Já existe layout no banco - use ele para essa sessão
      else
        console.log "Banco OK."
        @layout = JSON.parse reply

  # Retorna do banco todos os lugares identificados pelos id's presentes em idsArray
  # keysAreStructured indica se as chaves são apenas os ids inteiros ou já contem o namespace.
  getMultiplePlaces: (idsArray, callback, keysAreStructured) =>
    #console.log 'getMultiplePlaces sendo chamado com', idsArray, keysAreStructured
    placeKeys = if keysAreStructured then idsArray else @placeArrayKeys(idsArray);
    @client.mget placeKeys, (err, replies) ->
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
  getAllPlaces: (callback) =>
    @client.smembers @layoutKey(), (err, replyKeys) =>
      if err
        console.log "Erro ao recuperar lista de places.", err
        callback(undefined)
        return
      # console.log "Resultado de smembers com ", @layoutKey(), "foi", replyKeys
      # SMEMBERS já devolve as keys com o namespace apropriado, eg. layout:1:place:2
      keysAreStructured = true
      @getMultiplePlaces replyKeys, callback, keysAreStructured

  getPlace: (id, callback) =>
    layoutKey = "layout:" + layout.id
    fieldKey = layoutKey + ":place:" + id
    @client.get fieldKey, (err, reply) ->
      if err
        console.log "Erro ao recuperar lugar do banco.", err
        callback(undefined)
        return
      place = JSON.parse reply
      # console.log "Enviando lugar do REDIS: ", place
      callback(place)

  setPlacesMulti: (places, execCallback) =>
    argsArray = []
    for place in places
      fieldKey = @placeKey place.id
      argsArray.push fieldKey
      argsArray.push JSON.stringify place
    @client.multi().mset(argsArray).exec execCallback

  logOccupation: (occupationData) =>
    # Log full ocupation data - for each place, keep a key with a set sorted by Date
    occupation = new Occupation(occupationData.places, occupationData.occupyDate, undefined, occupationData.hasTeacher)
    for placeId in occupation.placesIdArray
      @client.zadd @placeLogKey(placeId), occupation.occupyDate.valueOf(), JSON.stringify(occupation)

  getPlaceOccupationsByDate: (placeId, year, month) =>
    deferred = Q.defer()
    startDate = moment([year, month - 1])
    endDate = moment(startDate).endOf('month')
    logKey = @placeLogKey(placeId)
    params = [logKey, startDate.valueOf(), endDate.valueOf()]
    # Retorne todos os logs de ocupação deste lugar entre as duas datas
    # replyArray tem, em pares, o conteúdo do log, e seu score.
    @client.zrangebyscore params, (err, replyArray) =>
      if err
        deferred.reject new Error(err)
      else
        occupations = []
        for occupation in replyArray
          occupations.push Occupation.fromJSON(occupation)

        deferred.resolve(occupations)

    return deferred.promise

  getAllOccupationsByDate: (year, month, callback) =>
    @client.smembers @layoutKey(), (err, replyKeys) =>
      if err
        console.log "Erro ao recuperar lista de places.", err
        callback(err)
        return

      promises = []
      # Para cada lugar nesse layout...
      for structuredKey in replyKeys
        # SMEMBERS já devolve as keys com o namespace apropriado, eg. layout:1:place:2
        placeId = structuredKey.replace(@placeKey(''), '')
        promises.push @getPlaceOccupationsByDate(placeId, year, month)

      Q.all(promises)
        .then((results) =>
          # Retira resultados duplicados - a mesma ocupação aparece varias vezes pois pertence a varios lugares
          uniqueResults = _u.chain(results).flatten().uniq((v) -> v.placesIdArray.toString() + v.occupyDate).value()
          callback(undefined, uniqueResults))
        .fail((err) => callback(err))

  # Retorna um array de arrays, com todos os horarios para todos os dias de semana, com as
  # ocupações relativas a esse mês e ano.
  # Aceita mês com índice baseado em 1
  getOccupationLogs: (year, month, callback) =>
    weekDays = []
    for day in [0..6]
      hours = []
      for hour in [0..23]
        hours.push {occupations: 0}
      weekDays.push hours

    @getAllOccupationsByDate year, month, (err, occupations) =>
      if err
        callback(err)
      else
        console.log occupations
        for occupation in occupations
          weekDays[occupation.occupyMoment.day()][occupation.occupyMoment.hours()].occupations += 1

        callback(undefined, weekDays)

module.exports = Persistence