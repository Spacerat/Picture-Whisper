
var Validator = require("./validate").Validator;
var rooms = require("./rooms");
var error = require("./base_error");
var BasePacket = require("./server_packet").Packet;

var io = require('socket.io');
var util = require('util');
var sys = require('sys');


var module = this;

this.AlreadyStartedError = error.Make(function(action) {
	action = action || "do this";
	this.message = "You cannot " + action + " because it has already started.";
	this.nostack = true;
	this.status = 403;
	error.Base.call(this);
});

this.InsufficientPrivalgeError = error.Make(function(action) {
	action = action || "do this";
	this.message = "You cannot " + action + " because you are not an admin.";
	this.nostack = true;
	this.status = 403;
	error.Base.call(this);
});

this.NotEnoughPlayersError = error.Make(function() {
	this.message = "You cannot begin the game because there are not enough players";
	this.nostack = true;
	this.status = 403;
	error.Base.call(this);
});

this.EmptyDescriptionError = error.Make(function() {
	this.message = "A description is required."
	this.nostack = true;
	error.Base.call(this);
});

this.NotYourTurnError = error.Make(function(action) {
	this.message = "It's not your turn to "+action+"!";
	this.nostack = true;
	error.Base.call(this);
});


this.DisconnectError = error.Make(function(client) {
	this.message = client.info.name + " has left the game. Unfortunately, this means that the game will not be able to continue; fixing this is on my todo list.";
	this.nostack = true;
	error.Base.call(this);
});


var GamePacket = function() {
	BasePacket.call(this);
	this.Start = function(room) {
		this.data.start = true;
		return this;
	}
	// Wait for @doer to @action @provider's thing for @reciever
	this.updateState = function(action, prevplayer, currplayer, nextplayer) {
		this.data.wait = {
			action: action,
			prevplayer: prevplayer.info,
			currplayer: currplayer.info,
			nextplayer: nextplayer.info
		}
		return this;
	}
	
	//Send @description, from @sender.
	this.drawThis = function(sender, description, destination, token) {
		this.data.drawThis = {
			sender: sender.info,
			description: description,
			destination: destination.info,
		}
		return this;
	}
	
	//Send an image, from @sender
	this.describeThis = function(sender, image, destination) {
		this.data.describeThis = {
			sender: sender.info,
			image: image,
			destination: destination.info
		}
		return this;
	}
	
	//Reciever of this message starts the game.
	this.initialScene = function(destination) {
		this.data.initialScene = {
			destination: destination.info
		}
		return this;
	}
	
	this.gameInfo = function(game) {
		this.data.game = game.getInfo();
		return this;
	}
}
sys.inherits(GamePacket, BasePacket);

var Game = function(options) {
	var me = this;
	var started = false;
	var limit_rounds, round_limit, min_players;
	
	var remaining_players = [];
	
	var prevplayer = {}, currplayer = {}, nextplayer = {};
	var description = "";
	var uploadtoken = " ";
	var history = [];
	
	//Init
	(function() {
		var validate = new Validator(options);
		min_players = validate.num("minplayers", {min: 3});
		if (options.limitrounds) {
			limit_rounds = true;
			round_limit = validate.num("roundlimit", {min: 1});
		}
		else {
			limit_rounds = false;
		}
	})();
	
	this.getHistory = function() {
		return history;
	}
	
	this.getInfo = function() {
		return {
			limit_rounds: limit_rounds,
			round_limit: round_limit,
			min_players: min_players,
			max_players: this.room.getMaxPlayers()
		}
	}

	this.checkJoinable = function() {
		if (started) {
			throw new module.AlreadyStartedError("join this game");
		}
		return true;
	}	
	
	this.newClient = function(client) {
		this.checkJoinable();
		new GamePacket().gameInfo(this).Send(client);
		return true;
	}
	
	this.handleDisconnection = function(client) {
		throw new module.DisconnectError(client);
	}
	
	var nextPlayer = function() {
		if (remaining_players.length === 0) {
			me.room.getClients().forEach(function(c) {
				remaining_players.push(c);
			});
		}	
		prevplayer = currplayer;
		currplayer = nextplayer;
		nextplayer = remaining_players.shift();
	}
	
	this.StartGame = function(client) {
		started = true;
		new GamePacket().Start().broadcastToRoom(client.listener, this.room);
		nextPlayer();
		nextPlayer();
		
		new GamePacket().initialScene(nextplayer).Send(currplayer);
		new GamePacket().updateState('start', prevplayer, currplayer, nextplayer).broadcastToRoom(currplayer.listener, this.room, currplayer);
		
	}
	
	this.handleMessage = function(client, type, data) {
		switch (type) {
			case 'begin':
				console.log("BeginAttempt", this.room.getClients().length, min_players);
				if (started) {
					throw new module.AlreadyStartedError("start the game");
				}
				else if (client.info.admin !== true) {
					throw new module.InsufficientPrivalgeError("start the game");
				}
				else if (this.room.getClients().length < min_players) {
					
					throw new module.NotEnoughPlayersError();
				}
				else
					this.StartGame(client);
				
				return true;
			case 'describe':
				if (!data) {
					throw new module.NoDataError();
				}
				if (client !== currplayer) {
					throw new module.NotYourTurnError("write");
				}
				description = data;
				history.push({
					description: description,
					by: currplayer.info
				})
				//TODO: limits
				
				nextPlayer();
				new GamePacket().updateState('paint', prevplayer, currplayer, nextplayer).broadcastToRoom(currplayer.listener, this.room, currplayer);
				new GamePacket().drawThis(prevplayer, description, nextplayer).Send(currplayer);
				return true;
			case 'upload':
				if (!data) {
					throw new module.NoDataError();
				}
				if (client !== currplayer) {
					throw new module.NotYourTurnError("write");
				}
				var dataurl = data.data;
				var name = data.name;
				var obj = {
					url: dataurl,
					name: name
				}
				history.push({
					image: obj,
					by: currplayer.info
				});
				nextPlayer();
				new GamePacket().updateState('describe', prevplayer, currplayer, nextplayer).broadcastToRoom(currplayer.listener, this.room, currplayer);
				new GamePacket().describeThis(prevplayer, obj, nextplayer).Send(currplayer);
				
				return true;
			default:
				return false;
		}
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
	
	this.getGame = function(id) {
		if (!rooms.getSessions()[id]) {
			throw new rooms.RoomNonExistantError();
		}
		else {
			return rooms.getSessions()[id].game;
		}
	}
	
	socket.on('connection', function(client) {
		rooms.newClient(client);
		client.on('disconnect', function() {
			try {
				rooms.handleDisconnect(client);
			}
			catch (err) {
				var erro;
				if (err.clienterror === true) {
					erro = {'error': {msg: err.message, stack: ""}};
				}
				else {
					erro = {'error': {msg: err.message, stack: err.stack}};
				}
				client.room.getClients().forEach(function(c){
					if (c !== client) {c.send(erro);}
				});

				
			}
		});
		
		client.on('connect', function() {
			
		});
		
		client.on('message', function(data) {
			for (var type in data) {
				var msg = data[type];
				try {
					rooms.handleMessage(client, type, msg);
				}
				catch (err) {
					if (err.clienterror === true) {
						client.send({'error': {msg: err.message, stack: ""}});
					}
					else {
						client.send({'error': {msg: err.message, stack: err.stack}});
					}
					
				}
			}
		});
	});
}
