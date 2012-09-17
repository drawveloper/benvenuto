(function() {
  var pad;

  pad = function(numNumber, numLength) {
    var strString;
    strString = "" + numNumber;
    while (strString.length < numLength) {
      strString = "0" + strString;
    }
    return strString;
  };

}).call(this);
