placesC = require './places.js'
_u = require 'underscore'
places = placesC.collection
flatPlaces = ->
  _u.chain(places.tables).map(
    (table) ->
      for place in table.places
        place.tableId = table.id
        place.tableX = table.x
        place.tableY = table.y
        place.tableClass = table._class
      return table.places
  ).flatten().value()

places.places = flatPlaces()
places.tables = undefined
console.log places

