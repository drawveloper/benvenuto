$(function(){
    var heatMap = new benvenuto.HeatMap();

    var startMap = function (year, month) {
        d3.json('relatorio/'+year+'-'+month+'.json', function(json) {
            heatMap.startMap(json);
        });
    };

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    startMap(year, month);
});
