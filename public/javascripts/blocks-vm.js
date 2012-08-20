// Classe que representa um lugar
function Place(id, label, occupied, recent) {
    var self = this;
    self.id = id;
    self.stale = false;
    self.label = ko.observable(label);
    self.selected = ko.observable(false);
    self.occupied = ko.observable(occupied);
    self.recent = ko.observable(recent);
    self.select = function () {
        self.selected(!self.selected());
    };
}

// Viewmodel para o layout
function LayoutViewModel() {
    var self = this;
    self.name = ko.observable();
    self.loading = ko.observable(false);
    self.places = ko.observableArray();
    self.occupiedPlacesNumber = ko.computed(function(){
       return ko.utils.arrayFilter(self.places(), function(item){
           item.occupied() === true;
       }).length;
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
    self.freePlaces = function(){
        if (self.loading()) {
            return false;
        }
        var selectedPlaces = {places:[]};
        $.each(self.selectedPlaces(), function(index, value) {
            selectedPlaces.places.push(value.id);
        });
        if ($.isEmptyObject(selectedPlaces)) {
            //TODO tratar validação - pedir para selecionar mesas.
            return false;
        }
        self.loading(true);

        self.freeCallback = function(data){
            if (data.result === 'ok') {
                $.each(self.selectedPlaces(), function(index, value) {
                    value.occupied(false);
                    value.selected(false);
                });
                self.loading(false);
            }
            else {
                alert('Ops! Aconteceu um erro ao ocupar os lugares. Cheque sua conexão com a rede.');
                self.loading(false);
                location.reload();
            }
        };

        //Envia o evento de ocupação para o servidor
        socket.emit('free', selectedPlaces, self.freeCallback);
        return false;
    }
    self.create = function(data){
        self.name(data.name);
        //Para cada table
        for (var index in data.tables) {
            var json = data.tables[index];
            //Para cada lugar
            for (var placeIndex in json.places) {
                var jsonPlace = json.places[placeIndex];
                self.places.push(new Place(jsonPlace.id, jsonPlace.label, jsonPlace.occupied, jsonPlace.recent));
            }
        }

        //Coloca na ordem correta
        self.places.sort(function(left, right) {
            return left.label() == right.label() ? 0 : (left.label() < right.label() ? -1 : 1)
        });
    };
    self.update = function (places){
        //Já recebemos os lugares - não precisa buscar no servidor.
        if (places != void(0)) {
            console.log('Lugares ocupados:', places.occupiedPlaces);
            for (var index in places.occupiedPlaces) {
                var id = places.occupiedPlaces[index];
                var place = self.findPlaceById(id);
                place.occupied(true);
            }
        }
    };

    socket.on('welcome', function (data) {
        console.log (data);
        self.create(data.data);
    });

    socket.on('occupy', function (data) {
        console.log ('occupy', data);
        self.update(data);
    });

    socket.on('free', function (data) {
        console.log ('free', data);
        self.update();
    });
}