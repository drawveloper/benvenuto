## GET home page.


exports.index = (req, res, settings) ->
  res.render 'index.ejs',
    title: 'Benvenuto'
    settings: settings
