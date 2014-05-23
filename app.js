var express = require('express');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var app = express();

var mongoDB = "mongodb://localhost";

// view engine setup
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('short'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({
  secret : 'kjh2jm3249nb8dc7db0x3ne2n203',
  name : 'textr-session',
  httpOnly : false,
  cookie : { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week til expire
}));
app.use(express.static(__dirname + '/public'));
app.use(function(req, res, next) {
  res.locals.username = req.session.username;
  next();
});

mongoose.connect(mongoDB+"/users");

var UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  wins: Number,
  losses: Number
});

var Users = mongoose.model('Users', UserSchema);

function restrict(req, res, next) {
  if(typeof req.session.username === 'undefined') res.redirect('login');
  else next();
}

app.get('/', restrict, function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  Users.find({username: req.body.username, password: req.body.password}, function(err, docs) {
    if (docs.length > 0) {
      req.session.username = req.body.username;
      res.redirect('/');
    }
    else res.render('login', {message: 'Login failed.'});
  });
});

app.get('/new', function(req, res) {
  res.render('new');
});

app.post('/new', function(req, res) {
  var body = req.body;
  var usernameRegex = /^[a-z0-9]+$/i;
  var passwordRegex = /^[a-z0-9._!@#$%^&*()]+$/i;

  if (body.username.length < 3 || body.username.legnth > 16) 
    res.render('new', {message: 'Username must be between 3 and 16 chacters'});
  else if (body.password.length < 3 || body.password.length > 16)
    res.render('new', {message: 'Password must be between 3 and 16 chacters'});
  else if (!usernameRegex.test(body.username))
    res.render('new', {message: 'Username must be alphanumeric'});
  else if (!passwordRegex.test(body.password))
    res.render('new', {message: 'Passwords only allow alphanumeric characters and these special characters: . _ ! @ # $ % ^ & * ( )'});
  else Users.find({username: body.username}, function(err, docs) {
    if (docs.length > 0) res.render('new', {message: 'Username already exists.'});
    else  new Users({
      username: body.username,
      password: body.password,
      email: body.email,
      wins: 0,
      losses: 0
    }).save(function(err, docs) {
      if (err) res.json(err);
      res.redirect('login');
    });
  });
});

app.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/login');
});

app.get('/play', restrict, function(req, res) {
  res.render('play');
});

app.get('/account', restrict, function(req, res) {
  res.render('account');
});

function compare(a,b) {
  if (a.wins < b.wins)
    return 1;
  if (a.wins > b.wins)
    return -1;
  if (a.wins == b.wins && a.losses > b.losses)
    return 1;
  if (a.wins == b.wins && a.losses < b.losses)
    return -1;
  return a.username.localeCompare(b.username);
}

app.get('/leaderboard', function(req, res) {
  Users.find({}, function(err, docs) {
    var data = [];
    for(var i = 0; i < docs.length; i++) {
      var datum = {} 
      datum.username = docs[i].username;
      datum.wins = docs[i].wins;
      datum.losses = docs[i].losses;

      data.push(datum);
    }

    data.sort(compare); 
    if (err) res.render('leaderboard');
    else res.render('leaderboard', {players: data});
  });
});

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
