$(function(){
    socket = io.connect();
    viewmodel = new LayoutViewModel();
    ko.applyBindings(viewmodel);
});