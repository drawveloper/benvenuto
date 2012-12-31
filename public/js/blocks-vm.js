//TODO receber do servidor
var maxTime = tableRecentTimeMillis != void(0) ? tableRecentTimeMillis : 1000 * 60 * 5;

// Classe que representa um lugar
function Place(id, label, occupied, lastOccupation) {
    var self = this;
    self.id = id;
    self.stale = false;
    self.label = ko.observable(label);
    self.selected = ko.observable(false);
    self.occupied = ko.observable(occupied);
    self.lastOccupation = ko.observable(lastOccupation != void(0)? lastOccupation : new Date());
    self.completion = ko.observable(0);
    self.updateCompletion = function() {
        var now = new Date().getTime();
        var then = new Date(self.lastOccupation()).getTime();
        var elapsedTime = now - then;
        //Avança completion
        self.completion((elapsedTime/maxTime) > 1 ? 1 : (elapsedTime/maxTime));
        //console.log('Completion avançada.')
    };
    self.select = function () {
        self.selected(!self.selected());
    };
    self.startColors = {red:239, green:239, blue:239};
    self.endColors = {red:255, green:121, blue:0};
    self.redDifference = self.endColors.red - self.startColors.red;
    self.greenDifference = self.endColors.green - self.startColors.green;
    self.blueDifference = self.endColors.blue - self.startColors.blue;
    self.red = ko.computed(function(){
        return self.startColors.red + (self.completion() * self.redDifference)
    });
    self.green = ko.computed(function(){
        return self.startColors.green + (self.completion() * self.greenDifference)
    });
    self.blue = ko.computed(function(){
        return self.startColors.blue + (self.completion() * self.blueDifference)
    });
    self.backgroundColor = ko.computed(function(){
            return 'rgba(' + Math.floor(self.red()) + ',' + Math.floor(self.green()) + ',' + Math.floor(self.blue()) + ',1)'
        }
    );
    //Number of steps é a maior diferença.
    self.numberOfSteps = (Math.abs(self.redDifference) > Math.abs(self.greenDifference)
        ? ( Math.abs(self.redDifference) > Math.abs(self.blueDifference)
        ? Math.abs(self.redDifference)
        : Math.abs(self.blueDifference) )
        : ( Math.abs(self.greenDifference) > Math.abs(self.blueDifference)
        ? Math.abs(self.greenDifference)
        : Math.abs(self.blueDifference) ) );
    self.interval = maxTime/self.numberOfSteps;

    self.calculateAnimation = function () {
        self.updateCompletion();
        self.currentStep = self.completion() * self.numberOfSteps;
        clearInterval(self.timer);
        self.timer = setInterval(function(){
            self.currentStep++;
            if (self.currentStep >= self.numberOfSteps)
                clearInterval(self.timer);

            self.updateCompletion();
        }, self.interval);
    }
    self.calculateAnimation();
}

// Viewmodel para o layout
function LayoutViewModel() {
    var self = this;
    self.name = ko.observable();
    self.loading = ko.observable(false);
    self.places = ko.observableArray();
    self.occupiedPlacesNumber = ko.computed(function(){
       return ko.utils.arrayFilter(self.places(), function(item){
           return item.occupied() === true;
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
        if (selectedPlaces.places.length == 0) {
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
        for (var index in data.places) {
            var jsonPlace = data.places[index];
            self.places.push(new Place(jsonPlace.id, jsonPlace.label, jsonPlace.occupied,
                jsonPlace.lastOccupation));
        }

        //Coloca na ordem correta
        self.places.sort(function(left, right) {
            return left.label() == right.label() ? 0 : (left.label() < right.label() ? -1 : 1)
        });
    };
    self.update = function (places){
        //Já recebemos os lugares - não precisa buscar no servidor.
        if (places != void(0)) {
            var occupy = places.occupiedPlaces != void(0);
            var placesArray = occupy ? places.occupiedPlaces : places.freePlaces;
            console.log('Lugares ' + (occupy ? 'ocupados' : 'liberados') + ':', placesArray);
            for (var index in placesArray) {
                var id = placesArray[index].id;
                var place = self.findPlaceById(id);
                place.lastOccupation(placesArray[index].lastOccupation);
                place.calculateAnimation();
                place.occupied(occupy);
            }
        }
    };

    //Socket IO
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
        self.update(data);
    });

    socket.on('disconnect', function () {
        console.log ('Disconnected!');
        alert('Desconectado do servidor. Cheque a conexão Wi-Fi do aparelho.');
        location.reload();
    });
}