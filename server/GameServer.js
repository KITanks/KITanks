var WebSocket   = require("ws");
var TankHandler = require("./TankHandler.js");
var Bullet      = require("./Bullet.js");
var Mine        = require("./Mine.js");

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

    // timestamp of last tick
    this.lastTick = Date.now();

    // bullets
    this.bullets = [];
    // next id to use
    this.bulletId = 0;

    this.mines = [];
    this.mineId = 0;

    // gameserver config
    this.config = {
        server_tickrate: 60,          // ticks per second
        server_max_players: 10,       // max players
        server_kick_after: 1000,      // kick after # ms of inactivity
        server_bullet_interval: 1000, // one bullet every # ms
        map_width: 2000,              // width units
        map_height: 1000,             // height units
        map_mine_count: 10            // initial mine count
    }
}

module.exports = GameServer;

/**
 * Starts the websocket server
 */
GameServer.prototype.start = function() {
    this.server = new WebSocket.Server({port: this.port}, function() {
        this.log(LogType.INFO, "Server listening on *:" + this.port);

        for (var i = 0; i < this.config.map_mine_count; i++)
            this.spawnMine();
    }.bind(this));

    // listener for incoming connections
    this.server.on("connection", onConnection.bind(this));

    function onClose() {
        this.self.log(LogType.DEBUG, "Client #" + this.socket.handler.getId() + " dropped connection.");

        // remove client from array
        this.self.removeClient(this.socket.handler.getId());
    }

    function onConnection(client) {
        // check for max player count
        if (this.clients.length >= this.config.server_max_players) {
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
    }.bind(this), 1000 / this.config.server_tickrate);

    this.log(LogType.INFO, "Simulating at " + this.config.server_tickrate + " ticks per second");
}

/**
 * Main game loop
 */
GameServer.prototype.loop = function() {
    var now = Date.now();
    var dt = now - this.lastTick;

    // update all bullets
    this.bullets.forEach(function(bullet) {
        bullet.update(dt);
    }.bind(this));

    // bullet-bullet collision
    this.bullets.forEach(function(bullet) {
        this.bullets.forEach(function(other) {
            if (bullet.getId() == other.getId())
                return;

            if (this.circleCircleCollision(bullet.x, bullet.y, bullet.radius,
                                           other.x, other.y, other.radius)) {
                this.removeBullet(bullet.getId());
                this.removeBullet(other.getId());
            }
        }.bind(this));
    }.bind(this));

    // tank-mine collision
    this.clients.forEach(function(client) {
        this.mines.forEach(function(mine) {
            if (this.circleCircleCollision(client.handler.x, client.handler.y, client.handler.width,
                                           mine.x, mine.y, mine.radius)) {
                this.respawnTank(client);
                this.removeMine(mine.id);
            }
        }.bind(this));
    }.bind(this));

    // inactivity kick
    this.clients.forEach(function(client) {
        if (now - client.handler.getLastUpdate() > this.config.server_kick_after) {
            var id = client.handler.getId();

            this.kickClient(client);
            this.removeClient(id);
        }
    }.bind(this));

    // tank-tank collision
    this.clients.forEach(function(client) {
        this.clients.forEach(function(other) {
            if (client.handler.getId() == other.handler.getId())
                return;

            if (this.circleCircleCollision(client.handler.x, client.handler.y, client.handler.width,
                                           other.handler.x, other.handler.y, other.handler.width)) {
                this.respawnTank(client);
                this.respawnTank(other);
            }
        }.bind(this));
    }.bind(this));

    // tank-bullet hit
    this.clients.forEach(function(client) {
        this.bullets.forEach(function(bullet) {
            if (this.circleCircleCollision(client.handler.x, client.handler.y, client.handler.width,
                                           bullet.x, bullet.y, bullet.radius)) {
                var shooter = bullet.getShooter();
                shooter.handler.addScore(1);

                this.removeBullet(bullet.getId());
                this.respawnTank(client);
            }
        }.bind(this));
    }.bind(this));

    // build data
    var bulletData = this.getBulletData();
    var tankData = this.getTankData();
    var mineData = this.getMineData();

    this.clients.forEach(function(client) {
        if (client.readyState !== WebSocket.OPEN)
            return;

        client.send(tankData);
        client.send(bulletData);
        client.send(mineData);
    });

    this.lastTick = now;
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

GameServer.prototype.removeBullet = function(id) {
    for (var i = 0; i < this.bullets.length; i++) {
        if (this.bullets[i].getId() == id)
            this.bullets.splice(i, 1);
    }
}

GameServer.prototype.spawnBullet = function(tank, x, y, ang) {
    var bullet = new Bullet(this, tank, this.getUniqueBulletId(), x, y, ang);
    this.bullets.push(bullet);
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

GameServer.prototype.getBulletData = function() {
    var bullets = [];
    this.bullets.forEach(function(bullet) {
        bullets.push(bullet.getData());
    }.bind(this));

    return JSON.stringify({
        pckid: 4,
        bullets: bullets
    });
}

GameServer.prototype.getTankData = function() {
    var tanks = [];
    this.clients.forEach(function(client) {
        tanks.push(client.handler.getData());
    });

    return JSON.stringify({
        pckid: 2,
        tanks: tanks
    });
}

GameServer.prototype.getMineData = function() {
    var mines = [];
    this.mines.forEach(function(mine) {
        mines.push(mine.getData());
    });

    return JSON.stringify({
        pckid: 7,
        mines: mines
    });
}

/**
 * Returns next unique id and increments it by one
 */
GameServer.prototype.getUniqueTankId = function() {
    return this.tankId++;
}

/**
 * Returns next unique id and increments it by one
 */
GameServer.prototype.getUniqueBulletId = function() {
    return this.bulletId++;
}

/**
 * Returns next unique id and increments it by one
 */
GameServer.prototype.getUniqueMineId = function() {
    return this.mineId++;
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

GameServer.prototype.removeMine = function(id) {
    for (var i = 0; i < this.mines.length; i++) {
        if (this.mines[i].id == id)
            this.mines.splice(i, 1);
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

GameServer.prototype.getRandomPosition = function() {
    return {
        x: Math.floor(Math.random() * this.config.map_width),
        y: Math.floor(Math.random() * this.config.map_height)
    }
}

GameServer.prototype.getRandomAngle = function() {
    return Math.floor(Math.random() * 360);
}

GameServer.prototype.circleCircleCollision = function(x1, y1, r1, x2, y2, r2) {
    return this.getDistance(x1, y1, x2, y2) <= (r1 + r2) * (r1 + r2);
}

GameServer.prototype.getDistance = function(x1, y1, x2, y2) {
    return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
}

GameServer.prototype.respawnTank = function(client) {
    var pos = this.getRandomPosition();
    client.handler.respawn(pos, this.getRandomAngle(), this.getRandomAngle());
}

GameServer.prototype.spawnMine = function() {
    var mine = new Mine(this, this.getUniqueMineId(), this.getRandomPosition());
    this.mines.push(mine);
}
