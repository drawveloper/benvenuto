## GET home page.


exports.index = (req, res) ->
  res.render 'index.ejs',
    title: 'Benvenuto'
    settings: selectedHall: 'HALL_1'
