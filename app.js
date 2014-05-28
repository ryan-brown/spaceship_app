var express = require('express'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    session = require('cookie-session'),
    bodyParser = require('body-parser'),
    bcrypt = require('bcrypt'),
    mongoose = require('mongoose'),
    app = express();

// view engine setup
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('short'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({
  secret : 'kjh2jm3249nb8dc7db0x3ne2n203y',
  name : 'textr-session',
  httpOnly : false,
  cookie : { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week til expire
}));
app.use(express.static(__dirname + '/public'));
app.use(function(req, res, next) {
  res.locals.username = req.session.username;
  next();
});

mongoose.connect('mongodb://localhost/users');
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

function restrict(req, res, next) {
  if(typeof req.session.username === 'undefined') res.redirect('login');
  else next();
}

app.get('/', restrict, function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login', {loginname: 'username'});
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var regex = new RegExp(["^",username,"$"].join(""),"i");
  User.findOne({username: regex}, function(err, user) {
    if (err || !user) res.render('login', {message: 'User not found.', loginname: username});
    else {
      var hash = bcrypt.hashSync(req.body.password, user.salt);
      if (hash == user.password) {
        req.session.username = user.username;
        res.redirect('/');
      }
      else res.render('login', {message: 'Login failed.', loginname: username});
    }
  });
});

app.get('/create', function(req, res) {
  res.render('create');
});

app.post('/create', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var usernameRegex = /^[a-z0-9]+$/i;
  var passwordRegex = /^[a-z0-9._!@#$%^&*()]+$/i;

  if (username.length < 3 || username.legnth > 16) 
    res.render('create', {message: 'Username must be between 3 and 16 chacters'});
  else if (password.length < 3 || password.length > 16)
    res.render('create', {message: 'Password must be between 3 and 16 chacters'});
  else if (!usernameRegex.test(username))
    res.render('create', {message: 'Username must be alphanumeric'});
  else if (!passwordRegex.test(password))
    res.render('create', {message: 'Passwords only allow alphanumeric characters and these special characters: . _ ! @ # $ % ^ & * ( )'});
  else {
    var regex = new RegExp(["^",username,"$"].join(""),"i");
    User.findOne({username: regex}, function(err, user) {
      if (user) res.render('create', {message: 'Username already exists.'});
      else {
        var salt = bcrypt.genSaltSync(12);
        var hash = bcrypt.hashSync(password, salt);

        new User({
          username: username,
          password: hash,
          salt: salt,
          email: req.body.email,
          wins: 0,
          losses: 0,
          elo: 1500
        }).save(function(err, docs) {
          if (err) res.json(err);
          res.redirect('login');
        });
      }
    });
  }
});

app.get('/logout', function(req, res) {
  req.session = null;
  res.redirect('/login');
});

app.get('/play', restrict, function(req, res) {
  res.render('play');
});

app.get('/users/:username', function(req, res, next) {
  var regex = new RegExp(["^",req.params.username,"$"].join(""),"i");
  User.findOne({username: regex}, function(err, user) {
    if (err || !user) {
      next();
    }

    var data = {};
    data.username = user.username;
    data.email = user.email;
    data.wins = user.wins;
    data.losses = user.losses;
    data.elo = user.elo;

    res.render('users', {user: data});
  });
});

function compare(a,b) {
  if (a.elo < b.elo)
    return 1;
  if (a.elo > b.elo)
    return -1;
  return a.username.localeCompare(b.username);
}

app.get('/leaderboard', function(req, res) {
  User.find({}, function(err, docs) {
    var data = [];
    for(var i = 0; i < docs.length; i++) {
      var datum = {} 
      datum.username = docs[i].username;
      datum.elo = docs[i].elo;
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
