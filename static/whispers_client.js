

Whispers = (function() {
	var me = {};
	var socket;
	
	me.Init = function(gameid) {
		socket = new io.Socket(null);
		socket.connect();
		socket.on('connect', function() {
			socket.send({'join': {
				id: gameid
			}});
		});
		socket.on('message', function(data) { 
			//Process network messages
			for (var msgname in data) {
				var msg = data[msgname];
				switch (msgname) {
					default:
						console.log(msgname, msg);
				}
			}
		});
	};
	
	return me;
}());
