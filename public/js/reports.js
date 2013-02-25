$(function(){
    var ReportsViewModel = function () {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var heatMap = new benvenuto.HeatMap();
        this.year = ko.observable(year);
        this.month = ko.observable(month);
        this.startMap = function(url){
            if (url === undefined) {
                url = this.yearMonthUrl();
            }
            $.mobile.showPageLoadingMsg('b', 'Carregando...');
            d3.json(url, function(json) {
                $.mobile.hidePageLoadingMsg();
                heatMap.startMap(json);
            });
        };
        this.yearMonthUrl = ko.computed(function(){
            return 'relatorio/' + this.year() + '-' + this.month() + '.json';
        }, this);
        this.yearMonthUrl.subscribe(this.startMap);
    };

    var reports = new ReportsViewModel();
    reports.startMap();
    ko.applyBindings(reports);
});
