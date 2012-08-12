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
        $.post('/liberar',
            selectedPlaces)
            .done(function(data){
                //alert("occupy ok");
                //location.reload();
// 			    	viewmodel.update();
                self.places.removeAll(self.selectedPlaces());
                self.loading(false);
            })
            .fail(function(){
                alert('Ops! Aconteceu um erro ao ocupar os lugares. Cheque sua conexão com a rede.');
                self.loading(false);
                location.reload();
            });
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
    }
}

var viewmodel = new LayoutViewModel();
// END KNOCKOUT JS

var request;
function getNextEvent(){
    request = $.ajax({url: '@{Hall.nextOccupiedPlaces}'})
        .done(function() {
            //alert('success');
            //location.reload();
            viewmodel.update();
            // getNextEvent();
        })
        .fail(function (xmlHttpRequest, textStatus, errorThrown) {
            if(xmlHttpRequest.readyState == 0 || xmlHttpRequest.status == 0)
                return;  // it's not really an error - just a refresh or navigating away
            else {
                // Do normal error handling
                alert('Ops! Aconteceu um erro ao receber lugares novos. Vamos tentar denovo.');
                location.reload();
            }
        });
};

$(function(){
    ko.applyBindings(viewmodel);
    viewmodel.update();
    //Next event sendo chamado pelo interval para impedir que loading bar fique aberto
    //getNextEvent();
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