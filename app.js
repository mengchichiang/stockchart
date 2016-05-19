var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var config = require('./lib/ini').parse(fs.readFileSync('./config.ini', 'utf-8'));

var routes = require('./routes/index');
//var route_portfolio = require('./routes/portfolio');
var route_downloadData = require('./routes/downloadData');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev')); //show GET, POST message
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// upload function
var multer  = require('multer');
app.use(multer({
  dest: './public/upload/',
  rename: function (fieldname, filename) {
    return filename;
  }
}));


//authentication
var auth = require('basic-auth');
app.use( function(req,res,next){
  var user = auth(req);
  if (!user || user.name !== config.authentication.user || user.pass !== config.authentication.password) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="term"')
    res.end('Access denied')
  } else {
    next();
  }
});

// route path 檔
app.use('/', routes);
app.use('/downloadData',route_downloadData);
//app.use('/portfolio', route_portfolio);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

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
