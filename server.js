var http = require('http'),
    fs = require('fs'),
    io = require('socket.io'),
    requirejs = require('requirejs'),
    keygrip = require('keygrip'),
    mongoose = require('mongoose');

requirejs.config({
  baseUrl: __dirname + '/public/javascripts',
  nodeRequire: require
});

var Player = requirejs('player');
var Bullet = requirejs('bullet');

var server = http.createServer().listen(8765);
var socket = io.listen(server);

mongoose.connect("mongodb://localhost/users");
var UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  salt: String,
  email: String,
  wins: Number,
  losses: Number,
  elo: Number
});

var User = mongoose.model('User', UserSchema);

var games = [];

var nextRoomID = 3;

var getGamesData = function() {
  var gamesData = [];
  if (games.length == 0) {
    var roomName = nextRoomID++;
    roomName = roomName.toString();
    games.push(new Game(roomName));
  }
  for(var i = 0; i < games.length; i++) {
    var game = games[i];
    var gameData = {};
    gameData.status = game.status;
    gameData.room = game.room;
    gameData.players = game.playersData();

    gamesData.push(gameData);
  }
  return gamesData;
}

var clientCallback = function(client) {
  client.emit('connected');
  client.authenticated = false;

  var player;

  client.on('authenticate', function(auth) {
    var data = auth.split('~');
    var hash = keygrip(['kjh2jm3249nb8dc7db0x3ne2n203y']).sign('textr-session='+data[0]);
    if (hash == data[1]) {
      var b = new Buffer(data[0], 'base64');
      var data = JSON.parse(b.toString());
      client.username = data.username;
      client.authenticated = true;
      client.emit('games', getGamesData());
      client.join('lobby');
    }
    else client.disconnect();
  });

  client.on('joinLobby', function(gameID) {
    if(!client.authenticated) return;

    for(var i = 0; i < games.length; i++) {
      if (games[i].room == gameID) {
        for(var j = 0; j < games[i].players.length; j++) {
          if (client.username == games[i].players[j].username) {
            games[i].players.splice(j, 1);
          }
        }
      }
    }

    var rooms = socket.sockets.manager.roomClients[client.id];
    for(var room in rooms) {
      client.leave(room);
    }
    client.join('lobby');
    socket.sockets.in('lobby').emit('games', getGamesData());
  });

  client.on('refreshGames', function() {
    if(!client.authenticated) return;

    client.emit('games', getGamesData());
  });

  client.on('join', function(room) {
    if(!client.authenticated) return;

    var foundGame;
    for (var i = 0; i < games.length; i++) {
      if (games[i].room == room) {
        foundGame = true;
        player = games[i].addPlayer(client.username);

        if(player) {
          var data = {};
          data.playerNum = player.playerNum;
          data.gameID = room;
          client.leave('lobby');
          client.join(room);
          client.emit('joined', data);
          socket.sockets.in('lobby').emit('games', getGamesData());
          break;
        }
        else {
          client.emit('roomFull', room);
          break;
        }
      }
    }

    if (!foundGame) {
      client.emit('noGameFound', room);
    }
  });

  client.on('create', function() {
    if (!client.authenticated) return;

    var roomName = nextRoomID++;
    roomName = roomName.toString();
    var newGame = new Game(roomName);
    player = newGame.addPlayer(client.username);
    games.push(newGame);

    client.join(roomName);
    client.leave('lobby');
    
    var data = {};
    data.playerNum = player.playerNum;
    data.gameID = roomName;
    client.emit('joined', data);
    socket.sockets.in('lobby').emit('games', getGamesData());
  });

  client.on('up', function(e) {
    if(player) player.upPressed = true;
  });

  client.on('left', function(e) {
    if(player) player.leftPressed = true;
  });

  client.on('right', function(e) {
    if(player) player.rightPressed = true;
  });

  client.on('fire', function(e) {
    if(player) player.firePressed = true;
  });

  client.on('upStop', function(e) {
    if(player) player.upPressed = false;
  });

  client.on('leftStop', function(e) {
    if(player) player.leftPressed = false;
  });

  client.on('rightStop', function(e) {
    if(player) player.rightPressed = false;
  });

  client.on('fireStop', function(e) {
    if(player) player.firePressed = false;
  });

  client.on('disconnect', function() {
    console.log('Player disconnected.');
  });
}

socket.on('connection', clientCallback);
socket.set('log level', 1);

var Game = function(room) {
  this.status = 0;
  this.room = room;
  this.tickRate = 10;
  this.updateRate = 25;
  this.tickInterval;
  this.updateInterval;
  this.players = [];
  this.bullets = [];
  this.winner;
  this.loser;
  this.sendBulletUpdate = false;
  this.startTime = 10000;
  this.beginCountdown = false;
  this.width = 800;
  this.height = 800;
  this.lastTimeTick;
  this.lastUpdateTick;

  this.addPlayer = function(username) {
    var playerNum;
    if (typeof this.players[0] === 'undefined') {
      playerNum = 0;
    }
    else if (typeof this.players[1] === 'undefined') {
      playerNum = 1;
    }
    else return false;

    var initialEntity = {
      entity: {
        x: (playerNum == 0) ? 200 : 600,
        y: (playerNum == 0) ? 200 : 600,
        width: 24,
        height: 24
      },
      playerNum: playerNum,
      username: username,
      color: {
        r: Math.floor(Math.random()*128),
        g: Math.floor(Math.random()*128),
        b: Math.floor(Math.random()*128)
      }
    }

    this.players[playerNum] = new Player(initialEntity);

    return this.players[playerNum];
  }

  this.playersData = function() {
    var data = [];
    for (var i = 0; i < this.players.length; i++) {
      data.push(this.players[i].username);
    }
    return data;
  }

  this.hypot = function(a, b) {
    return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
  }

  this.updateObjects = function(delta) {
    for (var i = 0; i < this.players.length; i++) {
      var player = this.players[i];
      
      player.update(delta)
  
      if (player.hp <= 0) {
        this.loser = player.username;
        this.winner = this.players[(i+1)%2].username;
        
        (function(winner, loser) {
          User.findOne({username: winner}, function(err1, winUser) {
          User.findOne({username: loser}, function(err2, loseUser) { 

          var r1, r2, k1, k2, R1, R2, E1, E1, d1, d2;

          r1 = winUser.elo;
          games1 = winUser.wins+winUser.losses;
          k1 = (games1 < 10) ? 50 : 30;

          r2 = loseUser.elo;
          games2 = loseUser.wins+loseUser.losses;
          k2 = (games2 < 10) ? 50 : 30;

          R1 = Math.pow(10, r1/400);
          R2 = Math.pow(10, r2/400);

          E1 = R1/(R1+R2);
          E2 = R2/(R1+R2);

          d1 = k1*(1-E1);
          d2 = k2*(-E2);

          winUser.wins += 1;
          loseUser.losses += 1;

          winUser.elo += Math.round(d1);
          loseUser.elo += Math.round(d2);

          winUser.save();
          loseUser.save();
        })})})(this.winner, this.loser);

        socket.sockets.in(this.room).emit('gameOver', player.playerNum);

        this.stop();
        for (var i = 0; i < games.length; i++) {
          if(games[i].room == this.room) {
            games.splice(i, 1);
        
            return;
          }
        }


      }
      if (player.firePressed && player.currentFireDelay == 0) {
        this.bullets.push(player.fire());
        this.sendBulletUpdate = true;
      }
    }
  
    for (var i = 0; i < this.bullets.length; i++) {
      var bullet = this.bullets[i];
  
      bullet.update(delta)
  
      if(bullet.lifeSpan <= 0) {
        this.bullets.splice(i, 1);
        this.sendBulletUpdate = true;
      }
    }
  }
  
  
  this.keepOnMap = function() {
    for(var i = 0; i < this.players.length; i++) {
      var entity = this.players[i].entity;
  
      if(entity.x > this.width) entity.x -= this.width;
      else if(entity.x < 0) entity.x += this.width;
  
      if(entity.y > this.height) entity.y -= this.height;
      else if(entity.y < 0) entity.y += this.height;
    }
  
    for(var i = 0; i < this.bullets.length; i++) {
      var entity = this.bullets[i].entity;
  
      if(entity.x > this.width) entity.x -= this.width;
      else if(entity.x < 0) entity.x += this.width;
  
      if(entity.y > this.height) entity.y -= this.height;
      else if(entity.y < 0) entity.y += this.height;
    }
  }
  
  this.collisions = function() {
    for (var i = 0; i < this.bullets.length; i++) {
      if(this.bullets[i].playerNum == 1 && this.bullets[i].entity.collide(this.players[0].entity)) {
        this.players[0].hp -= this.bullets[i].damage;
  
        this.bullets.splice(i, 1);
        this.sendBulletUpdate = true;
      }
      else if(this.bullets[i].playerNum == 0 && this.bullets[i].entity.collide(this.players[1].entity)) {
        this.players[1].hp -= this.bullets[i].damage;
  
        this.bullets.splice(i, 1);
        this.sendBulletUpdate = true;
      }
    }
  }
  
  this.tick = function() {
    var newTickTime = new Date().getTime();
    var delta = newTickTime - this.lastTickTime;
    this.lastTickTime = newTickTime;
 
    if (typeof this.players[0] === 'undefined' || typeof this.players[1] === 'undefined') return;
    else if (this.startTime == 10000 && !this.beginCountdown) {
      this.status = 1;
      socket.sockets.in(this.room).emit('beginCountdown', 10000);
      socket.sockets.in(this.room).emit('updatePlayers', this.players);
      this.beginCountdown = true;
      return
    }
    else if (this.beginCountdown && this.startTime > 0) {
      this.status = 2;
      this.startTime -= delta;
      return
    }
    
    if (this.status != 3) this.status = 3;
  
    this.updateObjects(delta);
    this.keepOnMap();
    this.collisions();
  }
  
  this.update = function() {
    var newUpdateTime = new Date().getTime();
    var delta = newUpdateTime - this.lastUpdateTime;
    this.lastUpdateTime = newUpdateTime;
    
    if(this.status != 3) return;

    socket.sockets.in(this.room).emit('updatePlayers', this.players);
  
    if (this.sendBulletUpdate) {
      socket.sockets.in(this.room).emit('updateBullets', this.bullets);
      this.sendBulletUpdate = false;
    }
  }

  this.lastTimeTick = new Date().getTime();
  this.lastUpdateTick = new Date().getTime();
  this.tickInterval = setInterval(this.tick.bind(this), this.tickRate);
  this.updateInterval = setInterval(this.update.bind(this), this.updateRate);

  this.stop = function() {
    clearInterval(this.tickInterval);
    clearInterval(this.updateInterval);
  } 
}

games.push(new Game('0'));
games.push(new Game('1'));
games.push(new Game('2'));
console.log('Server running on 162.243.13.107:8765');
