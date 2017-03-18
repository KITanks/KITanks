var Bullet = require("./Bullet.js");

/**
 * TankHandler, stores data for a tank and parses messages
 *   from client
 *
 * @param {GameServer} server - Main instance
 * @param {Client}     client - WebSocket client
 */
function TankHandler(server, client) {
    this.server = server;
    this.client = client;

    // remote address
    this.address = "";
    // player id
    this.id = -1;

    // time of last update
    this.lastUpdate = Date.now();

    // coords and rotation
    this.x = -1;
    this.y = -1;
    this.ang = 0;

    // time of last bullet
    this.lastBulletShot = 0;
}

module.exports = TankHandler;

/**
 * Returns player id
 */
TankHandler.prototype.getId = function() {
    return this.id;
}

/**
 * Sets remote address
 *
 * @param {string} address - Remote address
 */
TankHandler.prototype.setAddress = function(address) {
    this.address = address;
}

/**
 * Sets player id
 *
 * @param {number} id - Player id
 */
TankHandler.prototype.setId = function(id) {
    this.id = id;
    this.sendPacket01();
}

/**
 * Sends packet 01 to client
 */
TankHandler.prototype.sendPacket01 = function() {
    var data = {
        pckid: 1,
        id: this.id
    }

    this.client.send(JSON.stringify(data));
}

TankHandler.prototype.getLastUpdate = function() {
    return this.lastUpdate;
}

/**
 * Returns data for packet 2
 */
TankHandler.prototype.getData = function() {
    return {
        pckid: 2,
        id: this.id,
        x: this.x,
        y: this.y,
        ang: this.ang
    }
}

/**
 * Sets tank data
 *
 * @param {object} data - Tank data
 */
TankHandler.prototype.setData = function(data) {
    if (this.id == -1)
        return;

    this.x = data.x;
    this.y = data.y;
    this.ang = data.ang;
    
    // update time
    this.lastUpdate = Date.now();
}

/**
 * Parses packets
 *
 * @param {object} data - JSON data
 */
TankHandler.prototype.handleMessage = function(data) {
    if (!data.hasOwnProperty("pckid"))
        return;

    switch (data.pckid) {
        // position update
        case 10:
            if (!data.hasOwnProperty("x")
             || !data.hasOwnProperty("y")
             || !data.hasOwnProperty("ang"))
                break;
            this.setData({x: data.x, y: data.y, ang: data.ang});
            break;
        case 11:
            this.spawnBullet();
            break;
        default:
            break;
    }
}

TankHandler.prototype.spawnBullet = function() {
    var now = Date.now();

    if (now - this.lastBulletShot < this.server.config.bullet_interval)
        return;

    var bullet = new Bullet(this.server.getUniqueBulletId(), this.x, this.y, this.ang);
    this.server.bullets.push(bullet);

    console.log("added bullet " + bullet.id);

    this.lastBulletShot = now;
}

/**
 * Returns address
 */
TankHandler.prototype.getAddress = function() {
    return this.address;
}
