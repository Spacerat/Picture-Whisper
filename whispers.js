
var Validator = require("./validate").Validator;
var rooms = require("./rooms");
var error = require("./base_error");
var io = require('socket.io');
var util = require('util');
var module = this;

this.AlreadyStartedError = error.Make(function() {
	this.message = "This game has already started.";
	this.status = 403;
});

var Game = function(options) {
	var started = false;
	var limit_rounds, round_limit, min_players;
	//Init
	(function() {
		var validate = new Validator(options);
		if (options.limitrounds) {
			limit_rounds = true;
			round_limit = validate.num("roundlimit", {min: 1});
			min_players = validate.num("minplayers", {min: 3});
		}
		else {
			limit_rounds = false;
		}
	})();
	 

	this.checkJoinable = function() {
		if (started) {
			throw new module.AlreadyStartedError();
		}
		return true;
	}	
	
	this.newClient = function(client) {
		this.checkJoinable();
		return true;
	}
	
	this.handleMessage = function(client, type, data) {
		
	}
}


this.Server = function(app) {
	var socket = io.listen(app);
	
	this.newGame = function(options) {
		//Create the game
		var game = new Game(options);
		var room = new rooms.Room(options, game);
		return {room: room, game: game};
	}
	
	this.checkJoinable = function(id) {
		return rooms.checkRoomJoinable(id);
	}
	
	socket.on('connection', function(client) {
		rooms.newClient(client);
		client.on('disconnect', function() {
		
		});
		
		client.on('connect', function() {
			
		});
		
		client.on('message', function(data) {
			console.log("message", data);
			for (var type in data) {
				var msg = data[type];
				try {
					rooms.handleMessage(client, type, msg);
				}
				catch (err) {
					client.send({'error': err.message});
				}
			}
		});
	});
}
