var WebSocketServer = require('ws').Server;

function GameServer(port) {
    this.port = port;
    this.clients = [];
}

module.exports = GameServer;

GameServer.prototype.start = function() {
    // start new websocket server
    var wss = new WebSocketServer({port: this.port}, function() {
        console.log("Started server on :" + this.port + "...");
    }.bind(this));

    // listen for connections
    wss.on("connection", function onopen(client) {
        console.log("DEBUG: new client connected");

        /*wss.on("message", function onmessage(message) {
            console.log("DEBUG: received: " + message);
            client.send("Received message '" + message + "' from you");
        });*/

        wss.on("message", function incoming(message) {
            console.log("received: %s", message);
            client.send(message);
        });

        wss.on("close", function onclose() {
            console.log("DEBUG: connection closed");
        });

        wss.on("error", function onerror() {
            console.log("DEBUG: error");
        });
    });
}

GameServer.prototype.broadcast = function(message) {
    this.clients.forEach(function each(client) {
        if (client.readyState == WebSocket.OPEN)
            client.send(message);
    })
}
