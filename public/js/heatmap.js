// Fix map for IE
if (!('map' in Array.prototype)) { 
  Array.prototype.map = function (mapper, that /*opt*/) { 
    var other = new Array(this.length); 
    for (var i = 0, n = this.length; i < n; i++) 
      if (i in this) 
        other[i] = mapper.call(that, this[i], i, this); 
    return other; 
  }; 
};

var browser = BrowserDetect;

if (isOldBrowser()) {
	$('#old_browser_msg').show();
	$('#wtf').hide();
	$('fieldset#state').addClass('ff3');
	$('#ie8_percents').addClass('ff3');
	$('#share2').addClass('ff3');
	$('#poweredby.old_browsers').show();
}

var buckets = 11,
	colorScheme = 'rbow2',
	days = [
		{ name: 'Monday', abbr: 'Mo' },
		{ name: 'Tuesday', abbr: 'Tu' },
		{ name: 'Wednesday', abbr: 'We' },
		{ name: 'Thursday', abbr: 'Th' },
		{ name: 'Friday', abbr: 'Fr' }
	],
	hours = ['11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00']

var data;

if (isOldBrowser() === false) {
	createMap();
}

d3.select('#vis').classed(colorScheme, true);

d3.json('relatorio1.json', function(json) {
	
	data = json;

	createTiles();
	reColorTiles();

});

/* ************************** */

function isOldBrowser() {

	var result = false;
	if (browser.browser === 'Explorer' && browser.version < 9) {
		result = true;
	} else if (browser.browser === 'Firefox' && browser.version < 4) {
		result = true;
	}
	
	//console.log(result);
	
	return result;
}

/* ************************** */

function getCalcs() {
	
	var min = 1,
		max = -1;
	
	// calculate min + max
	for (var d = 0; d < data.views.length; d++) {
		for (var h = 0; h < data.views[d].length; h++) {

            var tot = data.views[d][h].occupations;
			
			if (tot > max) {
				max = tot;
			}
			
			if (tot < min) {
				min = tot;
			}
		}
	}
	
	return {'min': min, 'max': max};
};

/* ************************** */

function reColorTiles() {
	
	var calcs = getCalcs(),
		range = [];
	
	for (var i = 1; i <= buckets; i++) {
		range.push(i);
	}
	
	var bucket = d3.scale.quantize().domain([0, calcs.max > 0 ? calcs.max : 1]).range(range),
		side = d3.select('#tiles').attr('class');
	
	
	if (side === 'front') {
		side = 'back';
	} else {
		side = 'front';
	}
	
	for (var d = 0; d < data.views.length; d++) {
		for (var h = 0; h < data.views[d].length; h++) {

			var sel = '#d' + d + 'h' + h + ' .tile .' + side,
				val = data.views[d][h].occupations;
			
			// erase all previous bucket designations on this cell
			for (var i = 1; i <= buckets; i++) {
				var cls = 'q' + i + '-' + buckets;
				d3.select(sel).classed(cls , false);
			}
			
			// set new bucket designation for this cell
			var cls = 'q' + (val > 0 ? bucket(val) : 0) + '-' + buckets;
			d3.select(sel).classed(cls, true);
		}
	}
	flipTiles();
	if (isOldBrowser() === false) {
		drawHourlyChart(3);
	}
}

/* ************************** */

function flipTiles() {

	var oldSide = d3.select('#tiles').attr('class'),
		newSide = '';
	
	if (oldSide == 'front') {
		newSide = 'back';
	} else {
		newSide = 'front';
	}
	
	var flipper = function(h, d, side) {
		return function() {
			var sel = '#d' + d + 'h' + h + ' .tile',
				rotateY = 'rotateY(180deg)';
			
			if (side === 'back') {
				rotateY = 'rotateY(0deg)';	
			}
			if (browser.browser === 'Safari' || browser.browser === 'Chrome') {
				d3.select(sel).style('-webkit-transform', rotateY);
			} else {
				d3.select(sel).select('.' + oldSide).classed('hidden', true);
				d3.select(sel).select('.' + newSide).classed('hidden', false);
			}
				
		};
	};
	
	for (var h = 0; h < hours.length; h++) {
		for (var d = 0; d < days.length; d++) {
			var side = d3.select('#tiles').attr('class');
			setTimeout(flipper(h, d, side), (h * 20) + (d * 20) + (Math.random() * 100));
		}
	}
	d3.select('#tiles').attr('class', newSide);
}

/* ************************** */

function drawHourlyChart(day) {
	
	d3.selectAll('#hourly_values svg').remove();
	
	var w = 300,
		h = 150;
	
	var weeklyData = data.views[day];
		
		
	var y = d3.scale.linear()
		.domain([0, d3.max(weeklyData, function(d) { return d.occupations })])
		.range([0, h]);

	
	var chart = d3.select('#hourly_values .svg')
		.append('svg:svg')
		.attr('class', 'chart')
		.attr('width', 300)
		.attr('height', 170);
		
	var rect = chart.selectAll('rect'),
		text = chart.selectAll('text');
	
	rect.data(weeklyData)
		.enter()
			.append('svg:rect')
				.attr('x', function(d, i) { return i * 12; })
				.attr('y', function(d) { h - y(d.occupations) })
				.attr('height', function(d) { return y(d.occupations) })
				.attr('width', 10)
				.attr('class', function(d, i) { return 'hr' + i});
	
	text.data(hours)
		.enter()
			.append('svg:text')
				.attr('class', function(d, i) { return (i % 3) ? 'hidden hr' + i : 'visible hr' + i })
				.attr("x", function(d, i) { return i * 12 })
				.attr("y", 166)
				.attr("text-anchor", 'left')
				.text(String);
}

/* ************************** */

function createTiles() {

	var html = '<table id="tiles" class="front">';

	html += '<tr><th><div>&nbsp;</div></th>';

	for (var h = 0; h < hours.length; h++) {
		html += '<th class="h' + h + '">' + hours[h] + '</th>';
	}
	
	html += '</tr>';

	for (var d = 0; d < days.length; d++) {
		html += '<tr class="d' + d + '">';
		html += '<th>' + days[d].abbr + '</th>';
		for (var h = 0; h < hours.length; h++) {
			html += '<td id="d' + d + 'h' + h + '" class="d' + d + ' h' + h + '"><div class="tile"><div class="face front"></div><div class="face back"></div></div></td>';
		}
		html += '</tr>';
	}
	
	html += '</table>';
	d3.select('#vis').html(html);
}

/* ************************** */

function createMap() {
	var svg = d3.select("#map").append('svg:svg')
		.attr('width', 320)
		.attr('height', 202);
	
	var g = svg.append('svg:g')
		.attr('transform', 'scale(0.5) translate(-27, -134)');
}