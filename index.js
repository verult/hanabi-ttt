var express = require('express');
var H = require('./game')(null);

var port = Number(process.env.PORT || 5000);

var app = express();

app.get('/', function(req, res) {
    res.send('Player ID: ' + H.connect());
});

app.listen(port);