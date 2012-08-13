// KNOCKOUT JS
var viewmodel;
// Classe que representa um lugar
function Place(id, label, x, y, occupied, numberOfOccupants, table, rotation) {
    var self = this;
    self.id = id;
    self.label = ko.observable(label);
    self._x = ko.observable(x);
    self._y = ko.observable(y);
    self.table = ko.observable(table);
    self.x = ko.computed({
        read: function(){
            return self._x() + (self.table().x() * viewmodel.gridSizePixels());
        },
        write: function(value){ self._x(value) }
    });
    self.y = ko.computed({
        read: function(){
            return self._y() + (self.table().y() * viewmodel.gridSizePixels());
        },
        write: function(value){ self._y(value) }
    });
    self.numberOfOccupants = numberOfOccupants <= 0 ? 1 : numberOfOccupants;
    self.selected = ko.observable(false);
    self.occupied = ko.observable(occupied);
    self.rotation = rotation;
    self.select = function () {
        if (!self.occupied()) {
            self.selected(!self.selected());
// 				console.log(viewmodel.numberOfOccupants());
// 				console.log(viewmodel.selectedNumberOfOccupants());
            var selected = viewmodel.selectedNumberOfOccupants();
            viewmodel.numberOfOccupants(selected > 0 ? selected : 1 );
        }
    };
    self.occupy = function (value) {
        self.occupied(value);
        if (value)
            self.selected(false);
    };
}

// Viewmodel para o layout
function LayoutViewModel() {
    var self = this;
    self.name = ko.observable();
    self.loading = ko.observable(false);
    self.gridSizePixels = ko.observable(5);
    self.tables = ko.observableArray();
    self.hasTeacher = ko.observable(false);
    self.toggleTeacher = function(){
        self.hasTeacher(!self.hasTeacher());
    };
    self.places = ko.computed(function(){
        var array = [];
        for (var table in self.tables()) {
            var places = self.tables()[table].places();
            array = array.concat(places);
        }
        return array;
    });
    self.numberOfOccupants = ko.observable(1);
    self.addNumberOfOccupants = function(){
        self.numberOfOccupants(self.numberOfOccupants() + 1);
    };
    self.subtractNumberOfOccupants = function(){
        if (self.numberOfOccupants() > 1)
            self.numberOfOccupants(self.numberOfOccupants() - 1);
    };
    self.selectedNumberOfOccupants = ko.computed(function() {
        var count = 0;
        ko.utils.arrayMap(self.places(), function(item) {
            count += item.selected() ? item.numberOfOccupants : 0;
        });
        return count;
    });
    self.findTableById = function(id) {
        return ko.utils.arrayFirst(self.tables(), function(item) {
            return item.id == id;
        });
    };
    self.findPlaceById = function(id) {
        return ko.utils.arrayFirst(self.places(), function(item) {
            return item.id == id;
        });
    };
    self.selectedPlaces = ko.computed(function() {
        return ko.utils.arrayFilter(self.places(), function(item) {
            return item.selected();
        });
    });
    self.occupiedPlaces = ko.computed(function() {
        return ko.utils.arrayFilter(self.places(), function(item) {
            return item.occupied();
        });
    });
    self.occupiedPercent = ko.computed(function() {
        return (self.occupiedPlaces().length/self.places().length * 100).toFixed(0);
    });
    self.selectedPlacesLabel = ko.computed(function() {
        var selectedPlaces = self.selectedPlaces();
        var label = "";
        for (place in selectedPlaces) {
            label += selectedPlaces[place].label() + ', ';
        }
        //Retira a última vírgula
        label = label.slice(0, label.length - 2);
        return label;
    });
    self.occupyPlaces = function(){
        //No meio de uma ocupação.
        if (self.loading()) {
            return false;
        }
        var selectedPlaces = {places:[]};
        $.each(self.selectedPlaces(), function(index, value) {
            selectedPlaces.places.push(value.id*1);
        });
        if ($.isEmptyObject(selectedPlaces)) {
            //TODO tratar validação - pedir para selecionar mesas.
            return false;
        }
        selectedPlaces["numberOfOccupants"] = self.numberOfOccupants();
        selectedPlaces["hasTeacher"] = self.hasTeacher();
        /* alert(selectedPlaces["numberOfOccupants"]
         + " " + selectedPlaces["places[0].id"]
         + " " + selectedPlaces["places[1].id"]); */
        self.loading(true);

        socket.emit('occupy', selectedPlaces);

        self.occupyCallback = function(){
            //alert("occupy ok");
            //location.reload();
            self.numberOfOccupants(1);
            self.hasTeacher(false);
            $.each(self.selectedPlaces(), function(index, value) {
                value.occupy(true);
            });
            self.loading(false);
        }

        /*
        $.post('/ocupar',
            selectedPlaces)
            .done(function(data){
                //alert("occupy ok");
                //location.reload();
                self.numberOfOccupants(1);
                self.hasTeacher(false);
                $.each(self.selectedPlaces(), function(index, value) {
                    value.occupy(true);
                });
                self.loading(false);
            })
            .fail(function(){
                alert('Ops! Aconteceu um erro ao ocupar os lugares. Cheque sua conexão com a rede.');
                self.loading(false);
                location.reload();
            });
            */
        return false;
    };
    self.create = function(){
        $.getJSON('/lugares.json')
            .done(function(data) {
                viewmodel.name(data.name);
                viewmodel.gridSizePixels(data.gridSizePixels);
                //Para cada table
                for (var index in data.tables) {
                    var json = data.tables[index];
                    //Crie uma nova table
                    table = new Table(json.id, json.label, json.x, json.y, json['_class']);
                    self.tables.push(table);

                    //Para cada lugar
                    for (var placeIndex in json.places) {
                        var jsonPlace = json.places[placeIndex];
                        table.addPlace(jsonPlace);
                    }
                }
            })
            .fail(function (xmlHttpRequest, textStatus, errorThrown) {
                if(xmlHttpRequest.readyState == 0 || xmlHttpRequest.status == 0)
                    return;  // it's not really an error - just a refresh or navigating away
                else {
                    // Do normal error handling
                    alert('Ops! Aconteceu um erro ao receber os lugares. Vamos tentar denovo.');
                    location.reload();
                }
            });
    };
    self.update = function(){
        $.getJSON('/livres.json')
            .done(function(data) {
                //Para cada table
                for (var index in data) {
                    var json = data[index];
                    var place = self.findPlaceById(json.id);
                    place.occupy(json.occupied);
                }
            })
            .fail(function (xmlHttpRequest, textStatus, errorThrown) {
                if(xmlHttpRequest.readyState == 0 || xmlHttpRequest.status == 0)
                    return;  // it's not really an error - just a refresh or navigating away
                else {
                    // Do normal error handling
                    alert('Ops! Aconteceu um erro ao atualizar os lugares. Vamos tentar denovo.');
                    location.reload();
                }
            });
    };
}

viewmodel = new LayoutViewModel();
// END KNOCKOUT JS

var request;
function getNextEvent(){
    request = $.ajax({url: '/eventolivres'})
        .done(function() {
            //alert('success');
            viewmodel.update();
            getNextEvent();
        })
        .fail(function (xmlHttpRequest, textStatus, errorThrown) {
            if(xmlHttpRequest.readyState == 0 || xmlHttpRequest.status == 0)
                return;  // it's not really an error - just a refresh or navigating away
            else {
                // Do normal error handling
                alert('Ops! Aconteceu um erro ao receber lugares novos. Cheque a conexão com a rede.');
            }
        })
        .always(function(){
            // TODO getNextEvent aqui
        });
}

$(function(){
    ko.applyBindings(viewmodel);
    viewmodel.create();

    //TODO replace with socketio ack
    socket.on('ok', function(){
       console.log('caralho');
       viewmodel.occupyCallback();
    });

    //Next event sendo chamado pelo interval para impedir que loading bar fique aberto
// 		getNextEvent();

    //Ao receber foco, sempre atualize a lista de lugares.
    $(window).focus(function() {
        console.log('Focus');
        viewmodel.update();
        if (request != null) {
            request.abort();
        }
        // getNextEvent();
    });

    // Código para sobreviver a Sleeps e outras interrupções indesejadas da execução do JS.
    setInterval(function(){
            // $.active é o número de requests ajax abertos,
            // e o request.readyState 0 indica que o request está 'UNSENT'
            if ($.active == 0 || request == null || request.readyState == 0) {
// 				alert('Nenhuma conexão - reestabelecendo.');
                viewmodel.update();
                if (request != null) {
                    request.abort();
                }
                // getNextEvent();
            }
        }
        ,2000);

});