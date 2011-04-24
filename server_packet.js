
/* Packet class. 
    Example use of chaining: new Packet().acceptJoin().fullText(room).clientList(room).Send(client);
*/
this.Packet = function() {
    this.data = {};
};

this.Packet.prototype.Set = function(name, ndata) {
	this.data[name] = ndata;
	return this;
}

///////////////////////////////
//Send this packet to a client;
this.Packet.prototype.Send = function(client) {
    client.send(this.data);
};


//Send this packet to all clients other than @exclude
this.Packet.prototype.Broadcast = function(socket, exclude) {
    if (exclude) {
        socket.broadcast(this.data, exclude.sessionId);
    }
    else {
        socket.broadcast(this.data);
    }
};

//Send this packet to all clients in @room other than @exclude
this.Packet.prototype.broadcastToRoom = function(socket, room, exclude) {
    var i;
    var dest = room.getClients();
    for (i in dest) {
        if (dest[i]!==exclude) {dest[i].send(this.data);}
    }
};
