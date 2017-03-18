var GameServer = require("./GameServer.js");
/*
var server = new GameServer(3000);
server.start();*/

var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 3000}, function() {
    console.log("Started server on :" + 3000 + "...");
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
