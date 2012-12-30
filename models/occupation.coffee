moment = require 'moment'
class Occupation
  constructor: (@placesIdArray, @occupyDate, @freeDate) ->
    @occupyMoment = moment(@occupyDate)
    @freeMoment = moment(@freeDate)

  @fromJSON: (json) ->
    occupation = JSON.parse(json)
    return new Occupation(occupation.placesIdArray, occupation.occupyDate, occupation.freeDate)

root = exports ? this
root.Occupation = Occupation