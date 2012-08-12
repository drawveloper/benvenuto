#UTILS
pad = (numNumber, numLength) ->
  strString = "" + numNumber
  strString = "0" + strString  while strString.length < numLength
  strString