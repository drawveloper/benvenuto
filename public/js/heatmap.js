var benvenuto = window.benvenuto || {};
benvenuto.HeatMap = function () {
    var self = this;
    var buckets = 11,
        colorScheme = 'rbow2',
        days = [
            { name: 'Domingo', abbr: 'Dom' },
            { name: 'Segunda', abbr: 'Seg' },
            { name: 'Terça', abbr: 'Ter' },
            { name: 'Quarta', abbr: 'Qua' },
            { name: 'Quinta', abbr: 'Qui' },
            { name: 'Sexta', abbr: 'Sex' },
            { name: 'Sábado', abbr: 'Sáb' }
        ],
        hours = [
            '08:00', '08:30',
            '09:00', '09:00',
            '10:00', '10:30',
            '11:00', '11:30',
            '12:00', '12:30',
            '13:00', '13:30',
            '14:00', '14:30',
            '15:00', '15:30',
            '16:00', '16:30',
            '17:00', '17:30',
            '18:00', '18:30',
            '19:00', '19:30'];

    this.data = {};

    d3.select('#vis').classed(colorScheme, true);

    this.startMap = function(data) {
        this.data = data;
        this.createTiles();
        this.reColorTiles();
    };

    this.getCalcs = function() {

        var min = 1,
            max = -1;

        // calculate min + max
        for (var d = 0; d < this.data.views.length; d++) {
            for (var h = 0; h < this.data.views[d].length; h++) {

                var tot = this.data.views[d][h].occupations;

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

    this.reColorTiles = function() {

        var calcs = this.getCalcs(),
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

        for (var d = 0; d < this.data.views.length; d++) {
            for (var h = 0; h < this.data.views[d].length; h++) {

                var sel = '#d' + d + 'h' + h + ' .tile .' + side,
                    val = this.data.views[d][h].occupations;

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
        this.flipTiles();
    };

    this.flipTiles = function() {

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
                if (BrowserDetect.browser === 'Safari' || BrowserDetect.browser === 'Chrome') {
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
    };

    this.createTiles = function() {

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
                html += '<td id="d' + d + 'h' + h + '" class="d' + d + ' h' + h + '"><div class="tile"><div class="face front"></div><div class="face back"><p>'+self.data.views[d][h].occupations+'</p></div></div></td>';
            }
            html += '</tr>';
        }

        html += '</table>';
        d3.select('#vis').html(html);
    };

    this.createMap = function() {
        var svg = d3.select("#map").append('svg:svg')
            .attr('width', 320)
            .attr('height', 202);

        var g = svg.append('svg:g')
            .attr('transform', 'scale(0.5) translate(-27, -134)');
    };

    this.createMap();
};