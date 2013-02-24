socket = io.connect();
viewmodel = new LayoutViewModel();

$(function(){
    ko.applyBindings(viewmodel);
});