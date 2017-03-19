function Mine(server, id, pos) {
    this.server = server;

    this.id = id;

    this.x = pos.x;
    this.y = pos.y;

    this.radius = 40;
}

module.exports = Mine;

Mine.prototype.getData = function() {
    return {
        x: this.x,
        y: this.y
    }
}
