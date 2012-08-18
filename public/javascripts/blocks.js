socket = io.connect();
viewmodel = new LayoutViewModel();

$(function(){
    socket.on('welcome', function (data) {
        console.log (data);
    });

    ko.applyBindings(viewmodel);
    viewmodel.update();

    // Código para sobreviver a Sleeps e outras interrupções indesejadas da execução do JS.
    setInterval(function(){
            //TODO
        }
        ,2000);

});