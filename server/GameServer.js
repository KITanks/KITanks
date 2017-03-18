var WebSocketServer = require("ws").Server;
var TankHandler = require("./TankHandler.js");

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
    // server port
    this.port = port;

    // server start time
    this.startTime = Date.now();
    // all clients
    this.clients = [];
    // next id to use
    this.tankId = 0;

    // gameserver config
    this.config = {
        tickrate: 30,    // ticks per second
        max_players: 10, // max players
        kick_after: 1000
    }
}

module.exports = GameServer;

/**
 * Starts the websocket server
 */
GameServer.prototype.start = function() {
    this.server = new WebSocketServer({port: this.port}, function() {
        this.log(LogType.INFO, "Server listening on port :" + this.port);
    }.bind(this));

    // listener for incoming connections
    this.server.on("connection", onConnection.bind(this));

    function onClose() {
        this.self.log(LogType.DEBUG, "Client #" + this.socket.handler.getId() + " lost connection");

        // remove client from array
        this.self.removeClient(this.socket.handler.getId());
    }

    function onConnection(client) {
        // check for max player count
        if (this.clients.length >= this.config.max_players) {
            this.log(LogType.ERROR, "Server exceeds maximum player count, kicking client...");
            
            this.kickClient(client);
            return;
        }

        this.log(LogType.DEBUG, "New connection from " + client.upgradeReq.connection.remoteAddress);

        // message listener
        client.on("message", function onMessage(message) {
            try {
                // parse data and check for player id
                var data = JSON.parse(message);
                if (!data.hasOwnProperty("id"))
                    return;

                // get client and call handle function
                var cl = this.getClientById(client.upgradeReq.connection.remoteAddress, data.id);
                if (cl != null)
                    cl.handler.handleMessage(data);
            } catch(e) { }
        }.bind(this));

        var o_bind = {
            self: this,
            socket: client
        };

        // add instance of handler
        client.handler = new TankHandler(this, client);
        // set remote address
        client.handler.setAddress(client.upgradeReq.connection.remoteAddress);

        // register error and close listener
        client.on("error", onClose.bind(o_bind));
        client.on("close", onClose.bind(o_bind));

        this.clients.push(client);

        // send init package
        var id = this.getUniqueTankId();
        client.handler.setId(id);
    }

    // start game loop
    setInterval(function() {
        this.loop();
    }.bind(this), 1000 / this.config.tickrate);

    this.log(LogType.INFO, "Simulating at " + this.config.tickrate + " ticks per second");
}

/**
 * Main game loop
 */
GameServer.prototype.loop = function() {
    var now = Date.now();

    this.clients.forEach(function(cl) {
        // check last update time, kick if no recent response
        if (now - cl.handler.getLastUpdate() > this.config.kick_after) {
            var id = cl.handler.getId();
            // kick and remove from list
            this.kickClient(cl);
            this.removeClient(id);
        }
    }.bind(this));
}

/**
 * Sends the kick packet and closes connection to
 *   client afterwards
 */
GameServer.prototype.kickClient = function(client) {
    // send "kick" package
    client.send(JSON.stringify({pckid: 3}));
    client.close();
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
    });
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
            console.log("[INFO] " + message);
    }
}

/**
 * Returns next unique id and increments it by one
 */
GameServer.prototype.getUniqueTankId = function() {
    return this.tankId++;
}

/**
 * Removes client from storage
 *
 * @param {number} id - Player id
 */
GameServer.prototype.removeClient = function(id) {
    for (var i = 0; i < this.clients.length; i++) {
        if (this.clients[i].handler.getId() == id)
            this.clients.splice(i, 1);
    }
}

/**
 * Returns client with given address and id, null if invalid
 *
 * @param {string} address - Remote address
 * @param {number} id      - Player id
 */
GameServer.prototype.getClientById = function(address, id) {
    for (var i = 0; i < this.clients.length; i++) {
        var client = this.clients[i];
        if (client.handler.getId() == id
         && client.handler.getAddress() == address)
            return client;
    }

    return null;
}
