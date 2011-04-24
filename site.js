
var whispers = require("./whispers");
var http = require('http');
var express = require('express');
var templater = require('ejs');
var fs = require('fs');
var formidable = require('formidable');

var app = express.createServer();
var server;

app.configure(function() {
    app.use(express.static(__dirname + '/static'));
    app.use(express.bodyParser());
    
    app.use(express.cookieParser());
    app.use(express.session({key:"joe", secret:"lolwut"}));
    
    app.set("view engine", "html");
    app.set("view options", {layout: true});
    app.register( ".html", templater);
});
app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.logger());
});

app.configure('production', function(){
    app.use(express.errorHandler());
});
////
//Web Pages
////

app.error(function(err, req, res, next) {
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
});

app.get('/', function(req, res) {
	var head = templater.render(fs.readFileSync('views/index_head.html').toString());
	res.render('index', {
		sitetitle: "Picture Whispers"
		,pagetitle: ""
		,head: head
	});
});

app.post('/newgame', function(req, res) {
	var session = server.newGame(req.body);
	if (session) {
		res.redirect('/game/'+session.room.id, 303);
	}
});


app.get('/game/:id', function(req, res) {
	var id = req.params.id;
	server.checkJoinable(id);
	var head = templater.render(fs.readFileSync('views/game_head.html').toString(), {locals: {gameid: id}});
	
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

app.listen(8642);
server = new whispers.Server(app);

