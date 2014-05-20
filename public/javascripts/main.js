require.config({
  baseUrl: "/javascripts"
});

require(["game", "socket.io"], function(Game, io) {
  new Game();
});

