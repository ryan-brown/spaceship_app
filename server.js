var http = require('http'),
    fs = require('fs'),
    io = require('socket.io'),
    requirejs = require('requirejs');

requirejs.config({
  baseUrl: __dirname + '/public/javascripts',
  nodeRequire: require
});

var Player = requirejs('player');
var Bullet = requirejs('bullet');

var tickRate = 10;
var updateRate = 25;
var tickInterval;
var updateInterval;
var players = [];
var bullets = [];
var sendBulletUpdate = false;
var startTime = 10000;
var beginCountdown = false;
var width = 800;
var height = 800;
var lastTickTime;
var lastUpdateTime;

var serverCallback = function(req, res) {
  var response = (players.length < 2) ? 'open' : 'full';
  res.write(response);
  res.end();
}

var hypot = function(a, b) {
  return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
}
var server = http.createServer(serverCallback).listen(8765);
var socket = io.listen(server);

var clientCallback = function(client) {
  var playerNum;
  
  if (typeof players[0] === 'undefined') {
    playerNum = 0;
  }
  else if (typeof players[1] === 'undefined') {
    playerNum = 1;
  }
  else {
    client.emit('full', 0);
    client.disconnect();
    return;
  }

  console.log('Player '+playerNum+' connected.');

  var initialEntity = {
    entity: {
      x: (playerNum == 0) ? 200 : 600,
      y: (playerNum == 0) ? 200 : 600,
      width: 24,
      height: 24
    },
    playerNum: playerNum,
    color: {
      r: Math.floor(Math.random()*128),
      g: Math.floor(Math.random()*128),
      b: Math.floor(Math.random()*128)
    }
  }

  players[playerNum] = new Player(initialEntity);

  client.emit('connected', playerNum);

  client.on('up', function(e) {
    players[playerNum].upPressed = true;
    sendPlayerUpdate = true;
  });

  client.on('left', function(e) {
    players[playerNum].leftPressed = true;
    sendPlayerUpdate = true;
  });

  client.on('right', function(e) {
    players[playerNum].rightPressed = true;
    sendPlayerUpdate = true;
  });

  client.on('fire', function(e) {
    players[playerNum].firePressed = true;
  });

  client.on('upStop', function(e) {
    players[playerNum].upPressed = false;
    sendPlayerUpdate = true;
  });

  client.on('leftStop', function(e) {
    players[playerNum].leftPressed = false;
    sendPlayerUpdate = true;
  });

  client.on('rightStop', function(e) {
    players[playerNum].rightPressed = false;
    sendPlayerUpdate = true;
  });

  client.on('fireStop', function(e) {
    players[playerNum].firePressed = false;
  });

  client.on('disconnect', function() {
    console.log('Player '+playerNum+' dicsonnected.');
  });
}

socket.on('connection', clientCallback);
socket.set('log level', 1);

var reset = function() {
  var clientList = socket.sockets.clients();
  for(var i = 0; i < clientList.length; i++) {
    clientList[i].disconnect();
  }
  
  players = [];
  bullets = [];
  sendBulletUpdate = false;
  beginCountdown = false;
  startTime = 10000;
}

var updateObjects = function(delta) {
  for (var i = 0; i < players.length; i++) {
    var player = players[i];

    player.update(delta)

    if (player.hp <= 0) {
      socket.sockets.emit('gameOver', player.playerNum);
      reset();
    }

    if (player.firePressed && player.currentFireDelay == 0) {
      bullets.push(player.fire());
      sendBulletUpdate = true;
    }
  }

  for (var i = 0; i < bullets.length; i++) {
    var bullet = bullets[i];

    bullet.update(delta)

    if(bullet.lifeSpan <= 0) {
      bullets.splice(i, 1);
      sendBulletUpdate = true;
    }
  }
}


var keepOnMap = function() {
  for(var i = 0; i < players.length; i++) {
    var entity = players[i].entity;

    if(entity.x > width) entity.x -= width;
    else if(entity.x < 0) entity.x += width;

    if(entity.y > height) entity.y -= height;
    else if(entity.y < 0) entity.y += height;
  }

  for(var i = 0; i < bullets.length; i++) {
    var entity = bullets[i].entity;

    if(entity.x > width) entity.x -= width;
    else if(entity.x < 0) entity.x += width;

    if(entity.y > height) entity.y -= height;
    else if(entity.y < 0) entity.y += height;
  }
}

var collisions = function() {
  for (var i = 0; i < bullets.length; i++) {
    if(bullets[i].playerNum == 1 && bullets[i].entity.collide(players[0].entity)) {
      players[0].hp -= bullets[i].damage;

      bullets.splice(i, 1);
      sendBulletUpdate = true;
    }
    else if(bullets[i].playerNum == 0 && bullets[i].entity.collide(players[1].entity)) {
      players[1].hp -= bullets[i].damage;

      bullets.splice(i, 1);
      sendBulletUpdate = true;
    }
  }
}

var tick = function() {
  var newTickTime = new Date().getTime();
  var delta = newTickTime - lastTickTime;
  lastTickTime = newTickTime;

  if (typeof players[0] === 'undefined' || typeof players[1] === 'undefined') return;
  else if (startTime == 10000 && !beginCountdown) {
    socket.sockets.emit('beginCountdown', 10000);
    socket.sockets.emit('updatePlayers', players);
    beginCountdown = true;
    return
  }
  else if (beginCountdown && startTime > 0) {
    startTime -= delta;
    return
  }

  updateObjects(delta);
  keepOnMap();
  collisions();
}

var update = function() {
  var newUpdateTime = new Date().getTime();
  var delta = newUpdateTime - lastUpdateTime;
  lastUpdateTime = newUpdateTime;

  socket.sockets.emit('updatePlayers', players);

  if (sendBulletUpdate) {
    socket.sockets.emit('updateBullets', bullets);
    sendBulletUpdate = false;
  }
}

lastTime = new Date().getTime();
tickInterval = setInterval(tick, tickRate);
updateInterval = setInterval(update, updateRate);

console.log('Server running on 162.243.13.107:8765');
