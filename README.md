# Web socket game
This is a template to make multiplayer games using one big screen and many web devices controls (Smartphones, desktop, ESP32).
The game on the big screen is a Unity 3D app. The controller interfaces is a basic web interface (html,js) and the server between is a node.js. 
Each part use socket.io lib to send and receive messages.

# How does it run
- Launch the unity projet (v 2019+)
- Launch the remoteServer.js on node.js (remoteServer/remoteServer.js)
- It will listening on 127.0.0.1:3000
- In unity open scene "Scences/Game" and check the IP adresse (127.0.0.1) in the SocketIOController game object. 
- Play the unity scene
- Open a web page, 127.0.0.1:3000, write your pseudo and click spawn, You should will appear in the game. Else check the server logs.
