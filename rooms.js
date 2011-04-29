
var error = require("./base_error");
var Validator = require("./validate").Validator;
var BasePacket = require("./server_packet").Packet;

var sys = require("sys");

var rooms = {};
var module = this;


var RoomPacket = function() {
	BasePacket.call(this);
	this.clientList = function(room) {
		this.data.clientList = room.getClientsInfo();
		return this;
	}
	this.acceptJoin = function(client, game) {
		this.data.acceptJoin = client.info;
		return this;
	}
	this.clientLeft = function(client) {
		this.data.clientLeft = client.info;
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
	error.Base.call(this);
});

this.NotInGameError = error.Make(function() {
	this.message = "You cannot send this data because you are not in a game.";
	this.status = 403;
	error.Base.call(this);
});

this.NameAlreadyTakenError = error.Make(function(data) {
	this.message = "The name "+data+" is already in use in this game.";
	this.status = 403;
	this.nostack = true;
	error.Base.call(this);
});

//Room class
this.Room = function(options, game) {
	var max_players;
	var clients = [];
	var sessions = {};
	var that = this;
	
	this.id = "";
	this.game = game;
	this.game.room = this;
	var ids = 0;
	this.retain_players = false;

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
		while (rooms[that.id] !== undefined);	
		rooms[that.id] = that;
	})();
	
	
	this.generateSessionId = function(cookie) {
		var sid;
		do {
		    sid="";
		    for (x = 0; x < 32; x += 1) {
		        sid += String.fromCharCode(49+Math.floor(Math.random()*46));
		    }
		}
		while (sessions[sid] !== undefined);
		setTimeout(function() {
			if (sessions[sid] !== undefined) {
				sessions[sid].cookie = cookie;
			}
		}, 5000)
		return sid;
	}	
	
	this.clientByName = function(name) {
		for (var i = 0; i < clients.length; i++) {
			if (name === clients[i].info.name) {
				return clients[i];
			}
		}
		return null;
	}
	this.clientByIndex = function(i) {
		return clients[i];
	}
	
	this.getClient = function(i) {
		if (typeof(i) === 'string') {
			return this.clientByName(i);
		}
		else if (typeof(i) === 'number') {
			return this.clientByIndex(i);
		}
	}
	
	this.newClient = function(client, sid) {
		//Client joining already has a session in this room.
		if (sessions[sid]) {
			console.log("Existing session ",sid,"!");
			sessions[sid] = client;
			
			clients.every(function(c, i) {
				if (c.sid === sid) {
					c.room = null;
					c.sid = null;
					c.cookie = null;
					client.info = c.info;
					client.cookie = c.cookie;
					client.room = that;
					client.info.present = true;
					client.sid = sid;
					clients[i] = client;
					
					game.handleReconnect(c, client);
					new RoomPacket().acceptJoin(client).clientList(that).Send(client);
					return false;
				}
				
				return true;
			});
			return true;
		}
		else {
			if (clients.length + 1 > max_players) {
				throw new module.RoomFullError(max_players);
			};
			if (game.checkJoinable() === false) return false;
			client.info = {
				admin: false,
				name: "Anon",
				present: true
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
			client.sid = sid;
			client.info.name = newname;
			client.info.id = ids;
			ids+=1;
			clients.push(client);
			client.room = this;
			console.log("New client", client.info);
			new RoomPacket().acceptJoin(client).Send(client);
			new RoomPacket().clientList(this).broadcastToRoom(client.listener, this);
			game.newClient(client);
			sessions[sid] = client;
			return true;
		}
	}
	
	this.checkJoinable = function() {
		if (clients.length + 1 > max_players) {
			throw new module.RoomFullError(max_players);
		}
		return game.checkJoinable();
	}
	
	this.handleMessage = function(client, type, data) {
		switch (type) {
			case 'setName':
				clients.forEach(function(c) {
					if (c.info.name === data && c !== client) {
						throw new module.NameAlreadyTakenError(data);
					}
				});
				
				client.info.name = data;
				new RoomPacket().clientList(this).broadcastToRoom(client.listener, this);
				break;
			default:
				if (!game.handleMessage(client, type, data)) {
					console.error("Unrecognised message "+type, data);
				}
		}
	}
	
	this.handleDisconnect = function(client) {
		if (this.retain_players === true) {
			if (client.cookie) {
				client.cookie.maxAge = 900000;
				//client.cookie.touch();
				client.info.present = false;
			}
			
			return;
		};
		
		delete sessions[client.sid];
		client.sid = null;
		client.room = null;
		client.cookie = null;
		clients = clients.filter(function(c) {
			if (c === client) return false;
			return true;
		});
		if (clients.length === 0) {
			rooms[this.id] = null;
			delete rooms[this.id];
			game.room = null;
		}
		else if (client.info.admin === true) {
			client.info.admin = false;
			clients[0].info.admin = true;
			new RoomPacket().acceptJoin(clients[0]).Send(clients[0]);
		}
		game.handleDisconnection(client);
		new RoomPacket().clientLeft(client).clientList(this).broadcastToRoom(client.listener, this);
	}
	
	this.getClients = function() {
		return clients;
	}

    this.getClientsInfo = function() {
    	var ret = [];
    	for (var i = 0;i<clients.length;i++) {
    		var n = ret.push(clients[i].info);
    	}
    	return ret;
    }
    
    this.getMaxPlayers = function() {
    	return max_players;
    }
    
    this.__defineGetter__("game", function() {return game;});
    
}

this.getRooms = function() {
	return rooms;
}

this.checkRoomJoinable = function(id) {
	if (!rooms[id]) {
		throw new module.RoomNonExistantError();
	}
	return rooms[id].checkJoinable();
}

this.handleMessage = function(client, type, data) {
	if (type === 'join') {
		if (client.room === null) {
			if (data.id) {
				if (rooms[data.id] !== undefined) {
					return rooms[data.id].newClient(client, data.sid);
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

this.handleDisconnect = function(client) {
	if (client.room === null) {
		return;
	}
	client.room.handleDisconnect(client);
}

this.newClient = function(client) {
	client.room = null;
}
