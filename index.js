var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = Number(process.env.PORT || 5000);

app.use(express.static(__dirname + '/static'));
app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);

app.get('/', function(req, res) {
    res.render('index');
});

var player_sockets = {}
var sender = require('./sender')(io, player_sockets);
var H = require('./game')(sender);
require('./receiver')(io, player_sockets, H);

io.listen(app.listen(port));