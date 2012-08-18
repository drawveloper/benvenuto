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
        if (viewmodel.loading()) {
            return false;
        }

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

        //Entra em loading - bloqueia interface
        self.loading(true);

        self.occupyCallback = function(data){
            console.log(data);
            if (data.result === 'ok') {
                self.numberOfOccupants(1);
                self.hasTeacher(false);
                $.each(self.selectedPlaces(), function(index, value) {
                    value.occupy(true);
                });
                self.loading(false);
            }
            else {
                //Algo inesperado aconteceu. Vamos reconectar.
                location.reload();
            }
        }

        //Envia o evento de ocupação para o servidor
        socket.emit('occupy', selectedPlaces, self.occupyCallback);
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

    //Socket IO
    socket.on('free', function (data) {
        console.log ('free', data);
        self.update();
    });

    socket.on('occupy', function (data) {
        console.log ('occupy', data);
        self.update();
    });
}