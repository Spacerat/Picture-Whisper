
try {
	(function() {var a = console.log;})();
}
catch (e) {
	console = {
		log: function(object) {
			setTimeout(function() {
				throw new Error("log: "+JSON.stringify(object));
			},1);
		}
	}
}

