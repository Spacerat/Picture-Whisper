
var error = require("./base_error");
var module = this;

this.InvalidOptionsError = error.Make(function(message) {
	this.message = "Error creating game: "+message;
	this.status = 400;
	error.Base.call(this);
});

this.Validator = function(options) {
	this.num = function(name, conditions) {
		var n = parseInt(options[name], 10);
		if (isNaN(n)) throw new module.InvalidOptionsError("Expecting a number for "+name);
		if (conditions.max) if (n > conditions.max) throw new module.InvalidOptionsError("Expecting a value lower than "+conditions.max+" for "+name);
		if (conditions.min) if (n < conditions.min) throw new module.InvalidOptionsError("Expecting a value higher than "+conditions.min+" for "+name);
		return n;
	}
}
