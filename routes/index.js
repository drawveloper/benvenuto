
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index.ejs', { title: 'Benvenuto', settings: {selectedHall: 'HALL_1'}})
};