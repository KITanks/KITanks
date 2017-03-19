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

    var pos = this.server.getRandomPosition();

    // coords and rotation
    this.x = pos.x;
    this.y = pos.y;
    this.ang = 90;
    this.tur = 90;

    this.width = 16;
    this.length = 20;

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
        id: this.id,
        x: this.x,
        y: this.y
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
        ang: this.ang,
        tur: this.tur
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

    //this.x = this.limit(data.x, 0, this.server.config.map_width);
    //this.y = this.limit(data.y, 0, this.server.config.map_height);
    this.x = data.x;
    this.y = data.y;
    this.ang = this.map(data.ang, 0, 360);
    this.tur = this.map(data.tur, 0, 360);
    
    // update time
    this.lastUpdate = Date.now();
}

TankHandler.prototype.limit = function(val, min, max) {
    if (val < min)
        return min;
    else if (val > max)
        return max;
    else
        return val;
}

TankHandler.prototype.map = function(val, min, max) {
    if (val < min)
        return val + max;
    else if (val > max)
        return val - max;
    else
        return val;
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
             || !data.hasOwnProperty("ang")
             || !data.hasOwnProperty("tur"))
                break;
            this.setData({x: data.x, y: data.y, ang: data.ang, tur: data.tur});
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

    if (now - this.lastBulletShot < this.server.config.server_bullet_interval)
        return;

    this.server.spawnBullet(this.x, this.y, this.ang);

    this.lastBulletShot = now;
}

/**
 * Returns address
 */
TankHandler.prototype.getAddress = function() {
    return this.address;
}
