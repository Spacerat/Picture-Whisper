
var error = require("./base_error");
var Validator = require("./validate").Validator;
var BasePacket = require("./server_packet").Packet;
var sys = require("sys");
var sessions = {};
var module = this;


var RoomPacket = function() {
	BasePacket.call(this);
	this.clientList = function(room) {
		this.data.clientlist = room.getClientsInfo();
		return this;
	}
	this.acceptJoin = function(client) {
		this.data.acceptJoin = client.info;
		return this;
	}
}
sys.inherits(RoomPacket, BasePacket);

this.RoomFullError = error.Make(function(maxplayers) {
	this.message = "The room has reached its player limit of "+maxplayers+".";
	this.status = 403;
	error.Base.call(this);
}); 

this.AlreadyConnectedError = error.Make(function() {
	this.message = "This client is already connected to a different room";
	this.status = 403;
	error.Base.call(this);
});

this.RoomNonExistantError = error.Make(function() {
	this.message = "A room with this ID does not exist";
	this.status = 404;
});

this.NotInGameError = error.Make(function() {
	this.message = "You cannot send this data because you are not in a game.";
	this.status = 403;
});

//Room class
this.Room = function(options, game) {
	var max_players;
	var clients = [];
	var that = this;
	
	this.id = "";
	this.game = game;
	this.game.room = this;

	//Init
	(function() {
		var x
		var validate = new Validator(options);
		max_players = validate.num("maxplayers", {min: 3});	
		
		//Assign a new ID.
		do {
		    that.id="";
		    for (x = 0; x < 8; x += 1) {
		        that.id += String.fromCharCode(65+Math.floor(Math.random()*26));
		    }
		}
		while (sessions[that.id] !== undefined);	
		sessions[that.id] = that;
	})();
	
	this.clientByName = function(name) {
		for (var i = 0; i < clients.length; i++) {
			if (name === clients[i].info.name) {
				return clients[i];
			}
		}
		return null;
	}
	
	this.newClient = function(client) {
		if (clients.length + 1 > max_players) {
			throw new module.RoomFullError(max_players);
		};
		if (game.newClient(client) === false) return false;
		client.info = {
			admin: false,
			name: "Anon"
		};
		if (clients.length === 0) {
			client.info.admin = true;
		}
		//Assign the client a random name
        var t = 1;
        var newname = client.info.name;
		while (this.clientByName(newname) !== null) {
			newname = client.info.name + t;
			t+=1;
		}
		client.info.name = newname;
		clients.push(client);
		client.room = this;
		console.log("New client", client.info);
		new RoomPacket().acceptJoin().Send(client);
		new RoomPacket().clientList(this).broadcastToRoom(client.listener, this);
	}
	
	this.checkJoinable = function() {
		if (clients.length + 1 > max_players) {
			throw new module.RoomFullError(max_players);
		}
		return game.checkJoinable();
	}
	
	this.handleMessage = function(client, type, data) {
		switch (type) {
			
			default:
				if (!game.handleMessage(client, type, data)) {
					console.error("Unrecognised message "+type, data);
				}
		}
	}
	
	this.getClients = function() {
		return clients;
	}
    this.getClientsInfo = function() {
    	var ret = [];
    	for (var i = 0;i<clients.length;i++) {
    		ret.push(clients[i].info);
    	}
    	return ret;
    }
}

this.getSessions = function() {
	return sessions;
}

this.checkRoomJoinable = function(id) {
	if (!sessions[id]) {
		throw new module.RoomNonExistantError();
	}
	return sessions[id].checkJoinable();
}

this.handleMessage = function(client, type, data) {
	if (type === 'join') {
		if (client.room === null) {
			if (data.id) {
				if (sessions[data.id]) {

					return sessions[data.id].newClient(client);
				}
				else {
					throw new module.RoomNonExistantError();
				}
			}
		}
		else if (data.id !== client.room.id) {
			throw new module.AlreadyConnectedError();
		}
	}
	else {
		if (!client.room) {
			throw new module.NotInGameError();
		}
		else {
			client.room.handleMessage(client, type, data);
		}
	}
}

this.newClient = function(client) {
	client.room = null;
}
