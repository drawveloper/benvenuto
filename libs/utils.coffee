#UTILS
root = exports ? this
root.pad = (numNumber, numLength) ->
  strString = "" + numNumber
  strString = "0" + strString  while strString.length < numLength
  strString