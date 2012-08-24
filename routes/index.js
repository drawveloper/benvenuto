(function() {

  exports.index = function(req, res, settings) {
    return res.render('index.ejs', {
      title: 'Benvenuto',
      settings: settings
    });
  };

}).call(this);
