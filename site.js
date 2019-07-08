
var whispers = require("./whispers");
var http = require('http');
var express = require('express');
var templater = require('ejs');
var fs = require('fs');

var app = express();
var server;

var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var expressLayouts = require('express-ejs-layouts');


var GAME_HEAD = fs.readFileSync('views/game_head.ejs').toString();
var INDEX_HEAD = fs.readFileSync('views/index_head.ejs').toString();

app.use(express.static(__dirname + '/static'));
app.use(bodyParser.urlencoded());

app.use(cookieParser());
app.use(session({key:"picturewhispers", secret:"lolwut", maxAge: 7200000, resave: false, saveUninitialized: false}));

app.set("view options", {layout: true});
app.set('view engine', 'ejs');
app.use(expressLayouts);



if (app.get('env') == 'development') {
    // app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    // app.use(express.logger());
}


if (app.get('env') == 'production') {
    // app.use(express.errorHandler());
}

app.use(function(err, req, res, next){
	// if an error occurs Connect will pass it down
	// through these "error-handling" middleware
	// allowing you to respond however you like
	console.log(err);
	var stack = err.stack;
	if (err.clienterror === true || err.nostack === true) stack = "";
	
	res.render('error', {
		sitetitle: "Picture Whispers"
		,pagetitle: "Error"
		,error: err.message
		,stack: stack
		,head: ""
	});
})


app.get('/', function(req, res) {
	var head = templater.render(INDEX_HEAD);
	res.render('index.ejs', {
		sitetitle: "Picture Whispers"
		,pagetitle: ""
		,head: head
	});
});

app.get('/games', function(req, res) {
	res.send(server.getPublicGames());
});

app.post('/newgame', function(req, res) {
	console.log(req.body)
	var session = server.newGame(req.body);
	if (session) {
		res.redirect(303, '/game/'+session.room.id);
	}
});


app.get('/game/:id', function(req, res) {
	var id = req.params.id;

	var sid;
	if (!req.session[id]) {
		sid = server.generateSessionId(id, req.session.cookie);
		req.session[id] = sid;
	}
	else {
		sid = req.session[id];
	}
	
	var head = templater.render(GAME_HEAD, {gameid: id, sid: sid});
	res.render('game', {
		sitetitle: "Picture Whispers"
		,pagetitle: ""
		,head: head
	});
});

app.get('/game/:id/montage', function(req, res) {
	var id = req.params.id;
	var game = server.getGame(id);
	var history = game.getHistory();
	
	res.render('result', {
		sitetitle: "Picure Whispers"
		,pagetitle: "Montage"
		,head: ""
		,results: history
	});
});

var httpServer = http.createServer(app);
httpServer.listen(8642);
server = new whispers.Server(httpServer);
