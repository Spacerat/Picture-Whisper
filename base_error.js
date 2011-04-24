
var sys = require('sys');

this.Base = function () {
    Error.call(this,this.message);    
    Error.captureStackTrace(this, arguments.callee);
    this.clienterror = true;
}
sys.inherits(this.Base, Error);

this.Make = function(classobj) {
	sys.inherits(classobj, this.Base);
	return classobj;
}

