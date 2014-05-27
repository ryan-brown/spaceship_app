var express = require('express'),
    favicon = require('static-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    session = require('cookie-session'),
    bodyParser = require('body-parser'),
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
  email: String,
  wins: Number,
  losses: Number
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
  res.render('login');
});

app.post('/login', function(req, res) {
  User.find({username: req.body.username, password: req.body.password}, function(err, docs) {
    if (docs.length > 0) {
      req.session.username = req.body.username;
      res.redirect('/');
    }
    else res.render('login', {message: 'Login failed.'});
  });
});

app.get('/create', function(req, res) {
  res.render('create');
});

app.post('/create', function(req, res) {
  var body = req.body;
  var usernameRegex = /^[a-z0-9]+$/i;
  var passwordRegex = /^[a-z0-9._!@#$%^&*()]+$/i;

  if (body.username.length < 3 || body.username.legnth > 16) 
    res.render('create', {message: 'Username must be between 3 and 16 chacters'});
  else if (body.password.length < 3 || body.password.length > 16)
    res.render('create', {message: 'Password must be between 3 and 16 chacters'});
  else if (!usernameRegex.test(body.username))
    res.render('create', {message: 'Username must be alphanumeric'});
  else if (!passwordRegex.test(body.password))
    res.render('create', {message: 'Passwords only allow alphanumeric characters and these special characters: . _ ! @ # $ % ^ & * ( )'});
  else User.find({username: body.username}, function(err, docs) {
    if (docs.length > 0) res.render('create', {message: 'Username already exists.'});
    else  new User({
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
  User.findOne({username: req.session.username}, function(err, user) {
    var data = {};
    data.username = user.username;
    data.email = user.email;
    data.wins = user.wins;
    data.losses = user.losses;

    res.render('account', {user: data});
  });
});

function rankscore(wins, losses) {
  var totalGames = wins+losses;
  var ratio = (totalGames == 0) ? 0 : wins/(totalGames);

  return ratio*(1-Math.exp(-wins/8));
}

function compare(a,b) {
  var aScore = rankscore(a.wins, a.losses);
  var bScore = rankscore(b.wins, b.losses);

  if (aScore < bScore)
    return 1;
  if (aScore > bScore)
    return -1;
  
  return a.username.localeCompare(b.username);
}

app.get('/leaderboard', function(req, res) {
  User.find({}, function(err, docs) {
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
