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
    self.hasTeacher = ko.observable(false);
    self.toggleTeacher = function(){
        self.hasTeacher(!self.hasTeacher());
    };
    self.places = ko.observableArray([]);
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

    self.occupyPlacesWithTeacher = function() {
        self.occupyPlaces(true);
    };
    self.occupyPlacesWithoutTeacher = function() {
        self.occupyPlaces(false);
    };
    self.occupyPlaces = function(hasTeacher){
        //No meio de uma ocupação.
        if (self.loading()) {
            return false;
        }
        var selectedPlaces = {places:[]};
        $.each(self.selectedPlaces(), function(index, value) {
            selectedPlaces.places.push(value.id*1);
        });
        if (selectedPlaces.places.length == 0) {
            //TODO tratar validação - pedir para selecionar mesas.
            return false;
        }
        selectedPlaces["numberOfOccupants"] = self.numberOfOccupants();
        selectedPlaces["hasTeacher"] = hasTeacher;

        //Entra em loading - bloqueia interface
        self.loading(true);

        self.occupyCallback = function(data){
            console.log(data);
            if (data.result === 'ok') {
                self.numberOfOccupants(1);
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
    self.create = function(data){
        self.name(data.name);
        self.gridSizePixels(data.gridSizePixels);
        //Para cada table
        for (var index in data.places) {
            var json = data.places[index];
            self.places.push(new Place(json.id, json.label,
                json.x, json.y, json.occupied, json.numberOfOccupants,
                new Table(json.tableId, '', json.tableX, json.tableY, json.tableClass),
                json.rotation))
        }
    };
    self.update = function(places){
        //Já recebemos os lugares - não precisa buscar no servidor.
        if (places != void(0)) {
            var occupy = places.occupiedPlaces != void(0);
            var placesArray = occupy ? places.occupiedPlaces : places.freePlaces;
            console.log('Lugares ' + (occupy ? 'ocupados' : 'liberados') + ':', placesArray);
            for (var index in placesArray) {
                var id = placesArray[index].id;
                var place = self.findPlaceById(id);
                place.occupied(occupy);
            }
        }
    };

    //Socket IO
    socket.on('welcome', function (data) {
        console.log (data);
        self.create(data.data);
    });

    socket.on('free', function (data) {
        console.log ('free', data);
        self.update(data);
    });

    socket.on('occupy', function (data) {
        console.log ('occupy', data);
        self.update(data);
    });

    socket.on('disconnect', function () {
        console.log ('Disconnected!');
        alert('Desconectado do servidor. Cheque a conexão Wi-Fi do aparelho.');
        location.reload();
    });
}