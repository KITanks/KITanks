function Bullet(id, x, y, ang) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.ang = ang;

    this.velocity = 2;
}

module.exports = Bullet;

Bullet.prototype.update = function(dt) {
    this.x += this.velocity * Math.sin(this.ang * Math.PI / 180);
    this.y += this.velocity * -Math.cos(this.ang * Math.PI / 180);
}

Bullet.prototype.getData = function() {
    return {
        x: this.x,
        y: this.y,
        ang: this.ang
    }
}
