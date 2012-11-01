(function() {

  window.Table = (function() {

    function Table(id, label, x, y, _class) {
      this.id = id;
      this._class = _class;
      this.label = ko.observable(label);
      this.x = ko.observable(x);
      this.y = ko.observable(y);
      this.places = ko.observableArray();
    }

    return Table;

  })();

}).call(this);
