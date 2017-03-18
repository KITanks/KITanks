var WebSocketServer = require('ws').Server;

/**
 * GameServer instance, kind of serves as a 'constructor'
 * 
 * @param {number} port - WebSocket server port
 */
function GameServer(port) {
    this.port = port;

    this.startTime = (new Date()).getTime()
    this.clients = [];

    // gameserver config
    this.config = {
        max_players: 30
    }
}

module.exports = GameServer;

/**
 * Starts the websocket server
 */
GameServer.prototype.start = function() {
    this.server = new WebSocketServer({port: this.port}, function() {
        console.log("Started server on :" + this.port + "...");

        // init some stuff
    }.bind(this));

    // listener for incoming connections
    this.server.on("connection", onConnection.bind(this));

    function onClose() {
        console.log("DEBUG: connection closed");

        // remove player from clients array?
    }

    function onConnection(client) {
        if (this.clients.length >= this.config.max_players) {
            console.log("Server exceeded max players, kicking client...");            
            client.close();
            return;
        }

        console.log("DEBUG: new client connected");

        // message listener
        // TODO: auslagern in TankHandler/PlayerHandler
        client.on("message", function onmessage(message) {
            console.log("DEBUG: received: " + message);
            client.send(message);
        });

        // add server and client to object
        var o_bind = {
            server: this,
            socket: client
        };

        // register error and close listener
        client.on("error", onClose.bind(o_bind));
        client.on("close", onClose.bind(o_bind));

        this.clients.push(client);
    }
}

/**
 * Broadcasts a message to all clients
 *
 * @param {string} message - JSON message to broadcast
 */
GameServer.prototype.broadcast = function(message) {
    this.clients.forEach(function each(client) {
        if (client.readyState == WebSocket.OPEN)
            client.send(message);
    })
}
