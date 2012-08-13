window.socket = io.connect()
socket.on 'welcome', (data) ->
  console.log data