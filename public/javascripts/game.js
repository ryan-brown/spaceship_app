define(["player", "bullet"], function(Player, Bullet) {
  var Game = function() {
   // Variables
    var socket, games, inLobby, connected, countdownBegin, countdown, canvas, ctx,
        width, height, interval, tickRate, lastTime, players, bullets,
        playerNum, upPressed, leftPressed, rightPressed, firePressed;

    // Functions
    var init, clearScreen, updateGameSelected, update, updateObjects, collisions, keepOnMap,
        drawClients, drawBullets, draw, drawLobby, start;

    init = function() {
      canvas = document.getElementById('canvas');
      ctx = canvas.getContext('2d');
      connected = false;
      countdownBegin = false;
      countdown = 10000;
      width = 800;
      height = 800;
      players = [];
      bullets = [];
      games = [];
      gameSelected = 0;
      inLobby = true;
      playerNum;
      tickRate = 10;

      upPressed = false;
      leftPressed = false;
      rightPressed = false;
      downPressed = false;
      firePressed = false;

      joinPressed = false;
      createPressed = false;

      updateGameSelected = function(dir) {
        if (dir == 'up') {
          gameSelected--;
          if (gameSelected < 0) gameSelected = games.length-1;
        }
        else if (dir == 'down') {
          gameSelected++;
          if (gameSelected >= games.length) gameSelected = 0;
        }
      }

      addEventListener('keydown', function (e) {
        switch(e.keyCode) {
          case 32:
            e.preventDefault();
            if (!firePressed) {
              socket.emit('fire');
              firePressed = true;
            }
            break;
          case 74:
            if (inLobby && !joinPressed) {
              socket.emit('join', games[gameSelected].room);
              joinPressed = true;
            }
            break;
          case 78:
            if (inLobby && !createPressed) {
              socket.emit('create');
              createPressed = true;
            }
            break;
          case 82:
            if (inLobby) socket.emit('refreshGames');
            break;
          case 87:
            if (!upPressed) {
              if (inLobby) updateGameSelected('up');
              else socket.emit('up');
              upPressed = true;
            }
            break;
          case 83:
            if (!downPressed) {
              if (inLobby) updateGameSelected('down');
              downPressed = true;
            }
            break;
          case 65:
            if (!leftPressed) {
              socket.emit('left');
              leftPressed = true;
            }
            break;
          case 68:
            if (!rightPressed) {
              socket.emit('right');
              rightPressed = true;
            }
            break;
        }
      });

      addEventListener('keyup', function (e) {
        switch(e.keyCode) {
          case 32:
            e.preventDefault();
            if (firePressed) {
              socket.emit('fireStop');
              firePressed = false;
            }
            break;
          case 87:
            if (upPressed) {
              socket.emit('upStop');
              upPressed = false;
            }
            break;
          case 83:
            if (downPressed) {
              downPressed = false;
            }
          case 65:
            if (leftPressed) {
              socket.emit('leftStop');
              leftPressed = false;
            }
            break;
          case 68:
            if (rightPressed) {
              socket.emit('rightStop');
              rightPressed = false;
            }
            break;
        }
      });

      socket = io.connect('162.243.13.107:8765');

      socket.on('connected', function(e) {
        connected = true;
        var cookies = document.cookie.split('; ');
        var dataCookie, authCookie;
        for (var i = 0; i < cookies.length; i++) {
          if(cookies[i].indexOf('textr-session=') == 0) {
            dataCookie = cookies[i].substr(14);
          }
          else if (cookies[i].indexOf('textr-session.sig=') == 0) {
            authCookie = cookies[i].substr(18);
          }

        }
        var auth = dataCookie + '~' + authCookie;
        socket.emit('authenticate', auth);
      });

      socket.on('games', function(gamesData) {
        games = gamesData;
      });

      socket.on('joined', function(playerNumData) {
        playerNum = playerNumData;
        inLobby = false;
        console.log(playerNum);
      });

      socket.on('roomFull', function(room) {
        alert('Room '+room+' full, please try again later.');
        joinPressed = false;
        createPressed = false;
      });
      
      socket.on('nogameFound', function(room) {
        alert('Room '+room+' not found, please try again later.');
        joinPressed = false;
        createPressed = false;
      });

      socket.on('beginCountdown', function(countdown) {
        countdownBegin = true;
      });

      socket.on('updatePlayers', function(playersUpdate) {
        for (var i = 0; i < playersUpdate.length; i++) {
          players[i] = new Player(playersUpdate[i]);
        }
      });

      socket.on('updateBullets', function(bulletsUpdate) {
        bullets = [];
        for (var i = 0; i < bulletsUpdate.length; i++) {
          bullets[i] = new Bullet(bulletsUpdate[i]);
        }
      });

      socket.on('gameOver', function(losingPlayer) {
        ctx.font = '30px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var message;

        if (playerNum == losingPlayer) {
          ctx.fillStyle = 'DD2222';
          message = 'You have been destroyed.';
        } else {
          ctx.fillStyle = '22DD22';
          message = 'You Won!';
        }

        ctx.fillText(message, width/2, height/2);
        clearInterval(interval);
      });

      socket.on('disconnect', function() {
        clearInterval(interval);
        alert('Disconnected from server');
      });

      lastTime = new Date().getTime();
    }

    clearScreen = function() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, width, height);
    }

    update = function () {
      var newTime = new Date().getTime();
      var delta = newTime-lastTime;
      lastTime = newTime;

      if(inLobby) {
        drawLobby();
        return;
      }

      if (!connected || countdown > 0) {
        if (countdownBegin) countdown -= delta;
        draw();
        return;
      }

      updateObjects(delta);
      keepOnMap();
      collisions();
      draw();
    }

    var hypot = function(a, b) {
      return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    }

    updateObjects = function(delta) {
      for (var i = 0; i < players.length; i++) {
        players[i].update(delta);
      }

      for (var i = 0; i < bullets.length; i++) {
        var bullet = bullets[i];

        bullet.update(delta);

        if(bullet.lifeSpan <= 0) {
          bullets.splice(i, 1);
        }
      }
    }

    collisions = function() {
      for (var i = 0; i < bullets.length; i++) {
        if(bullets[i].entity.collide(players[0].entity)) {
          players[0].hp -= bullets[i].damage;
          bullets.splice(i, 1);
        }
        else if(bullets[i].entity.collide(players[1].entity)) {
          players[1].hp -= bullets[i].damage;
          bullets.splice(i, 1);
        }
      }
    }

    keepOnMap = function() {
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

    drawLobby = function() {
      clearScreen();
      ctx.font = '50px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '44BB44';
      ctx.fillText('Lobby', width/2, 100);

      ctx.font = '20px Georgia';
      ctx.fillStyle = '223322';
      ctx.fillText('J to join ~ R to refresh rooms ~ N to create room', width/2, height-100);

      for(var i = 0; i < games.length; i++) {
        ctx.font = '20px Georgia';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        if (gameSelected == i) ctx.fillStyle = '222288';
        else ctx.fillStyle = '882222';

        var g = games[i];

        var playersText = '(';
        playersText += g.players.length + '/2) Players';
        if (g.players.length > 0) playersText += ': '+g.players[0]
        if (g.players.length > 1) playersText += ' v '+g.players[1]

        ctx.fillText('Room: ' + games[i].room + ' - ' + playersText +' - Status: ' + games[i].status, 100, 200+i*50);
      }
    }

    draw = function() {
      clearScreen();
      drawClients();
      drawBullets();
      if (!countdownBegin) {
        ctx.font = '20px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'DDDDDD';
        ctx.fillText('Waiting for opponent...', width/2, height/2);
      }
      else if (countdown > 0 && countdownBegin) {
        ctx.font = '20px Georgia';
        ctx.align = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '22DD22';
        ctx.fillText(
          'Starting in '+ Math.ceil(countdown/1000),
          width/2,
          height/2
        );
      }
    }

    drawClients = function() {
      for(var i = 0; i < players.length; i++) {
        players[i].draw(ctx, playerNum);
      }
    }

    drawBullets = function() {
      for(var i = 0; i < bullets.length; i++) {
        bullets[i].draw(ctx);
      }
    }

    // Start the game! Initialize and call game loop every 10 ms
    start = function() {
      init();
      interval = setInterval(update, tickRate);
    }

    start();
  }
  return Game;
});

