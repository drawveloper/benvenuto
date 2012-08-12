# Classe que representa uma mesa
class window.Table
  constructor : (@id, label, x, y, @_class) ->
    @label = ko.observable(label)
    @x = ko.observable(x)
    @y = ko.observable(y)
    @places = ko.observableArray()

  addPlace : (json) ->
    @places.push new Place(json.id, json.label,
      json.x, json.y, json.occupied, json.numberOfOccupants,
      this, json.rotation)