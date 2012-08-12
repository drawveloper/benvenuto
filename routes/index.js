(function() {

  exports.index = function(req, res) {
    return res.render('index.ejs', {
      title: 'Benvenuto',
      settings: {
        selectedHall: 'HALL_1'
      }
    });
  };

}).call(this);
