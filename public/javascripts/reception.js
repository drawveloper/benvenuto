socket = io.connect();
viewmodel = new LayoutViewModel();

$(function(){
    ko.applyBindings(viewmodel);

    // Código para sobreviver a Sleeps e outras interrupções indesejadas da execução do JS.
    setInterval(function(){
            //TODO
        }
        ,2000);

});