define(["entity"], function(Entity) {
  var Bullet = function(json) {
    this.entity = (typeof json.entity === 'undefined') ? new Entity({}) : new Entity(json.entity);
    this.playerNum = (typeof json.playerNum === 'undefined') ? -1 : json.playerNum;
    this.angle = (typeof json.angle === 'undefined') ? 0 : json.angle;
    this.speed = (typeof json.speed === 'undefined') ? 600 : json.speed;
    this.damage = (typeof json.damage === 'undefined') ? 10 : json.damage;
    this.lifeSpan = (typeof json.lifeSpan === 'undefined') ? 1000 : json.lifeSpan;
    this.dx = this.speed*Math.cos(this.angle);
    this.dy = -this.speed*Math.sin(this.angle);

    this.update = function(delta) {
      var deltaTime = delta/1000;

      this.entity.x += deltaTime*this.dx;
      this.entity.y += deltaTime*this.dy;

      this.lifeSpan -= delta;
    }

    this.draw = function(ctx) {
      ctx.fillStyle = '#DDDD00';

      ctx.beginPath();
      ctx.arc(this.entity.x, this.entity.y, this.entity.width, 0, Math.PI*2, true);
      ctx.closePath();
      ctx.fill();
    }
  }

  return Bullet;
});