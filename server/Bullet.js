function Bullet(server, id, x, y, ang) {
    this.server = server;

    this.id = id;
    this.x = x;
    this.y = y;
    this.ang = ang;

    this.velocity = 5;
    this.radius = 4;

    this.border = 10;
}

module.exports = Bullet;

Bullet.prototype.update = function(dt) {
    this.x += this.velocity * Math.sin(this.ang * Math.PI / 180);
    this.y += this.velocity * -Math.cos(this.ang * Math.PI / 180);

    if (this.x < -this.border
     || this.x > this.server.config.map_width + this.border
     || this.y < -this.border
     || this.y > this.server.config.map_height + this.border)
        this.server.removeBullet(this.id);
}

Bullet.prototype.getId = function() {
    return this.id;
}

Bullet.prototype.getData = function() {
    return {
        x: this.x,
        y: this.y,
        ang: this.ang
    }
}
