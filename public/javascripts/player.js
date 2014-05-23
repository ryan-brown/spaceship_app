define(["entity", "bullet"], function(Entity, Bullet) {
  var Player = function(json) {
    this.entity           = (typeof json.entity           === 'undefined') ?
                            new Entity({}) : new Entity(json.entity);
    this.playerNum        = (typeof json.playerNum        === 'undefined') ?
                            -1 : json.playerNum;
    this.username         = (typeof json.username         === 'undefined') ?
                            '' : json.username;
    this.color            = (typeof json.color            === 'undefined') ?
                            '444444' : json.color;
    this.maxSpeed         = (typeof json.maxSpeed         === 'undefined') ?
                            150 : json.maxSpeed;
    this.rotateSpeed      = (typeof json.rotateSpeed      === 'undefined') ?
                            Math.PI : json.rotateSpeed;
    this.accel            = (typeof json.accel            === 'undefined') ?
                            150 : json.accel;
    this.dx               = (typeof json.dx               === 'undefined') ?
                            0 : json.dx;
    this.dy               = (typeof json.dy               === 'undefined') ?
                            0 : json.dy;
    this.angle            = (typeof json.angle            === 'undefined') ?
                            0 : json.angle;
    this.hp               = (typeof json.hp               === 'undefined') ?
                            100 : json.hp;
    this.fuel             = (typeof json.fuel             === 'undefined') ?
                            100 : json.fuel;
    this.fuelLossRate     = (typeof json.fuelLossRate     === 'undefined') ?
                            2 : json.fuelLossRate;
    this.fireDelay        = (typeof json.fireDelay        === 'undefined') ?
                            200 : json.fireDelay;
    this.currentFireDelay = (typeof json.currentFireDelay === 'undefined') ?
                            0 : json.currentFireDelay;
    this.upPressed        = (typeof json.upPressed        === 'undefined') ?
                            false : json.upPressed;
    this.leftPressed      = (typeof json.leftPressed      === 'undefined') ?
                            false : json.leftPressed;
    this.rightPressed     = (typeof json.rightPressed     === 'undefined') ?
                            false : json.rightPressed;
    this.firePressed      = (typeof json.firePressed      === 'undefined') ?
                            false : json.firePressed;

    var hypot = function(a, b) {
      return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    }

    var rgbToHex = function(r, g, b) {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    this.fire = function() {
      this.currentFireDelay = this.fireDelay;
      var radius = this.entity.width/2;
      var spawnX = this.entity.x+radius*Math.cos(this.angle);
      var spawnY = this.entity.y-radius*Math.sin(this.angle);

      return new Bullet({
        entity: {
          x: spawnX,
          y: spawnY,
          width: 2,
          height: 2
        },
        angle: this.angle,
        dx: this.dx,
        dy: this.dy,
        playerNum: this.playerNum
      });
    }

    this.update = function(delta) {
      var deltaTime = delta/1000;

      if (this.leftPressed && !this.rightPressed && this.fuel > 0) {
        this.angle += deltaTime*this.rotateSpeed;
        this.fuel -= deltaTime*this.fuelLossRate/4;
        if (this.fuel < 0) this.fuel = 0;
      }
      else if (!this.leftPressed && this.rightPressed && this.fuel > 0) {
        this.angle -= deltaTime*this.rotateSpeed;
        this.fuel -= deltaTime*this.fuelLossRate/4;
        if (this.fuel < 0) this.fuel = 0;
      }

      if (this.upPressed && this.fuel > 0) {
        this.dx += deltaTime*this.accel*Math.cos(this.angle);
        this.dy -= deltaTime*this.accel*Math.sin(this.angle);
        this.fuel -= deltaTime*this.fuelLossRate;
        if (this.fuel < 0) this.fuel = 0;
      }

      var currentSpeed = hypot(this.dx, this.dy);
      if(currentSpeed > this.maxSpeed) {
        var ratio = this.maxSpeed/currentSpeed;
        this.dx *= ratio;
        this.dy *= ratio;
      }

      this.entity.x += deltaTime*this.dx;
      this.entity.y += deltaTime*this.dy;

      if (this.currentFireDelay != 0) {
        this.currentFireDelay -= delta;
        if (this.currentFireDelay < 0) this.currentFireDelay = 0;
      }
    }

    this.draw = function(ctx, playerNum) {
      ctx.fillStyle = rgbToHex(this.color.r, this.color.g, this.color.b);
      ctx.strokeStyle = '#222222';

      var radius = this.entity.width/2;
      ctx.beginPath();
      ctx.moveTo(this.entity.x+radius*Math.cos(this.angle),
                this.entity.y-radius*Math.sin(this.angle));
      ctx.lineTo(this.entity.x+radius*Math.cos(this.angle+2*Math.PI/3),
                this.entity.y-radius*Math.sin(this.angle+2*Math.PI/3));
      ctx.lineTo(this.entity.x, this.entity.y);
      ctx.lineTo(this.entity.x+radius*Math.cos(this.angle+4*Math.PI/3),
                this.entity.y-radius*Math.sin(this.angle+4*Math.PI/3));
      ctx.closePath();
      ctx.fill();
      if (playerNum == this.playerNum) ctx.stroke();

      // Fuel
      ctx.fillStyle = '#DD0000';
      ctx.fillRect(
        this.entity.x-this.entity.width/2,
        this.entity.y-this.entity.height/2-9,
        this.entity.width,
        3
      );
      ctx.fillStyle = '#0000DD';
      ctx.fillRect(
        this.entity.x-this.entity.width/2,
        this.entity.y-this.entity.height/2-9,
        this.entity.width*(this.fuel/100),
        3
      );

      // HP Bar
      ctx.fillStyle = '#DD0000';
      ctx.fillRect(
        this.entity.x-this.entity.width/2,
        this.entity.y-this.entity.height/2-5,
        this.entity.width,
        3
      );
      ctx.fillStyle = '#00DD00';
      ctx.fillRect(
        this.entity.x-this.entity.width/2,
        this.entity.y-this.entity.height/2-5,
        this.entity.width*(this.hp/100),
        3
      );
    }
  }

  return Player;
});

