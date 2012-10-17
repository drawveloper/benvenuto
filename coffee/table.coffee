# Classe que representa uma mesa
class window.Table
  constructor : (@id, label, x, y, @_class) ->
    @label = ko.observable(label)
    @x = ko.observable(x)
    @y = ko.observable(y)
    @places = ko.observableArray()