/**
 * Module dependencies.
 */

var express = require('express'), 
	routes = require('./routes'),
    placesC = require('./places/places.js'),
	_u = require('underscore');

var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
	app.set('views', __dirname + '/views');
// app.set('view engine', 'jade');
	app.set('view engine', 'ejs');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
	app.use(express.errorHandler({
		dumpExceptions : true,
		showStack : true
	}));
});

app.configure('production', function() {
	app.use(express.errorHandler());
});

var places = placesC.collection;

var flatPlaces = function () {
	return _u.chain(places.tables)
		.map(function(table){
			return table.places;
		})
		.flatten()
		.value();
}

// Routes

app.get('/', routes.index);


app.get('/recepcao', function(req,res){
	  res.render('reception.ejs');
});

app.get('/salao1', function(req,res){
	  res.render('blocks.ejs');
});

app.get('/lugares.json', function(req,res){
	res.send(places);
});

app.get('/livres.json', function(req,res){
	res.send(_u.chain(flatPlaces())
			.filter(function(place){
				return place.occupied === false;
			})
			.value());
});

app.get('/ocupados.json', function(req,res){
	res.send(_u.chain(flatPlaces())
			.flatten()
			.filter(function(place){
				return place.occupied === true;
			})
			.value());
});

app.post('/ocupar', function(req,res){
	var occupiedPlaces = req.param('places','null');
	console.log(occupiedPlaces);
	_u.each(occupiedPlaces, function(id){
		var place = _u.find(flatPlaces(), function(place){
			return place.id*1 === id*1;
		});
		place.occupied = true;
	});
	res.send('ok');
});

app.post('/liberar', function(req,res){
	var freePlaces = req.param('places','null');
	console.log(freePlaces);
	_u.each(freePlaces, function(id){
		var place = _u.find(flatPlaces(), function(place){
			return place.id*1 === id*1;
		});
		place.occupied = false;
	});
	res.send('ok');
});

app.listen(3000, function() {
	console.log("Express server listening on port %d in %s mode",
			app.address().port, app.settings.env);
});