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

    // coords and rotation
    this.x = -1;
    this.y = -1;
    this.ang = 0;
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
    this.sendPackage01();
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

/**
 * Returns data for packet 2
 */
TankHandler.prototype.getPacket02 = function() {
    var data = {
        pckid: 2,
        id: this.id,
        x: this.x,
        y: this.y,
        ang: this.ang
    }

    return JSON.stringify(data);
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
}

/**
 * Parses packets
 *
 * @param {object} data - JSON data
 */
TankHandler.prototype.handleMessage = function(data) {
    //
}

/**
 * Returns address
 */
TankHandler.prototype.getAddress = function() {
    return this.address;
}
