var WebSocketServer = require('ws').Server;

/**
 * Logging types for log function
 */
var LogType = {
    INFO:  1,
    ERROR: 2,
    DEBUG: 3
}

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
        this.log(LogType.INFO, "Server listening on port :" + this.port);

        // init some stuff
    }.bind(this));

    // listener for incoming connections
    this.server.on("connection", onConnection.bind(this));

    function onClose() {
        this.log(LogType.INFO, "A client lost connection");

        // remove player from clients array?
    }

    function onConnection(client) {
        // check for max player count
        if (this.clients.length >= this.config.max_players) {
            this.log(LogType.INFO, "Server exceeds maximum player count, kicking client...");
            client.close();
            return;
        }

        this.log(LogType.INFO, "New connection from " + client.upgradeReq.connection.remoteAddress);

        // message listener
        // TODO: auslagern in TankHandler/PlayerHandler
        client.on("message", function onmessage(message) {
            this.log(LogType.DEBUG, "Received message '" + message + "'");
            client.send(message);
        }.bind(this));

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

/**
 * Displays message in console
 */
GameServer.prototype.log = function(type, message) {
    switch (type) {
        case LogType.ERROR:
            console.log("[ERROR] " + message);
            break;
        case LogType.DEBUG:
            console.log("[DEBUG] " + message);
            break;
        default:
        case LogType.INFO:
            console.log("[INFO ] " + message);
    }
}
