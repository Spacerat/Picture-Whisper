
var sys = require('sys');

this.Base = function () {
	this.clienterror = true;
    Error.call(this,this.message);    
    Error.captureStackTrace(this, arguments.callee);    
}
sys.inherits(this.Base, Error);

this.Make = function(classobj) {
	sys.inherits(classobj, this.Base);
	return classobj;
}

