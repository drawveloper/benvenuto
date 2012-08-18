// KNOCKOUT JS
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
    self.findPlaceById = function(id) {
        return ko.utils.arrayFirst(self.places(), function(item) {
            return item.id == id;
        });
    };
    self.markAllStale = function (){
        ko.utils.arrayMap(self.places(), function(item) {
            item.stale = true;
        });
    };
    self.deleteStale = function (){
        self.places.remove(function(item){ if (item.stale) console.log('stale! ' + item.id); return item.stale })
    };
    self.deleteAll = function (){
        self.places.remove(function(item){ return true; })
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
                self.places.removeAll(self.selectedPlaces());
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
    self.update = function (){
        $.getJSON('/ocupados.json')
            .done(function(data) {
                self.markAllStale();
// 		    	self.deleteAll();
                for (var index in data) {
                    var json = data[index];
                    var place = self.findPlaceById(json.id);
                    if (place == null)
                        self.places.push(new Place(json.id, json.label, json.occupied, json.recent));
                    else {
                        place.recent(json.recent);
                        place.stale = false;
                    }
                }
                self.deleteStale();
                self.places.sort(function(left, right) {
                    return left.label() == right.label() ? 0 : (left.label() < right.label() ? -1 : 1)
                });
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

    socket.on('occupy', function (data) {
        console.log (data);
        self.update();
    });
}