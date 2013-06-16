// poet runtime support

var RT = {

    'poet::*load-path*' : ["."],
    'poet::*env*'       : null,
    'poet::*out*'       : null /* defined at end of file */,
    'poet::window'      : null /* defined at end of file */,	
    
    'poet::macroexpand-1' : null,
    'poet::macroexpand' : null,
    'poet::expand' : null,

    'poet::List'    : List,
    'poet::Symbol'  : Symbol,
    'poet::Keyword' : Keyword,
    'poet::pr'      : pr,
    'poet::prn'     : prn,
    'poet::print'   : print,
    'poet::println' : println,
    'poet::newline' : newline,    

    'poet::symbol' : function(namespace, name) {
	switch(arguments.length) {
	case 1: 
	    name = namespace
	    namespace = null
	case 2: 
	    return namespace ?
		new Symbol.Qualified(namespace, name) :
		new Symbol.Simple(name)
	default:
	    throw Error(
		'poet::symbol requires 1 or 2 arguments but got ' + 
		    arguments.length
	    )
	}
    },

    'poet::keyword' : function(x) {
	if (x instanceof Keyword) {
	    return x
	} else {
	    return new Keyword('' + x)
	}
    },

    'poet::list' : List.create,
    'poet::array->list' : List.fromArray,

    'poet::acat' : function() {
	var res = []
	function push(x) { res.push(x) }
	for (var i=0; i<arguments.length; i++) {
	    if (arguments[i]) { arguments[i].forEach(push) }
	}
	return res
    },

    'poet::+' : function(x, y) {
	switch(arguments.length) {
	case 0: return 0
	case 1: return x
	case 2: return x + y
	default:
	    var r = x + y
	    var i = 2;
	    while (i<arguments.length) { r += arguments[i++] }
	    return r
	}
    },

    'poet::*' : function(x, y) {
	switch(arguments.length) {
	case 0: return 1
	case 1: return x
	case 2: return x * y
	default:
	    var r = x * y
	    var i = 2;
	    while (i<arguments.length) { r *= arguments[i++] }
	    return r
	}
    },

    'poet::-' : function(x, y) {
	switch(arguments.length) {
	case 0: throw Error('poet::- requires at least one argument')
	case 1: return -x
	case 2: return x - y
	default:
	    var r = x - y
	    var i = 2;
	    while (i<arguments.length) { r -= arguments[i++] }
	    return r
	}
    },

    'poet::/' : function(x, y) {
	switch(arguments.length) {
	case 0: throw Error('poet::/ requires at least one argument')
	case 1: return 1/x
	case 2: return x / y
	default:
	    var r = x/y
	    var i = 2;
	    while (i<arguments.length) { r /= arguments[i++] }
	    return r
	}
    },

    'poet::<' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('poet::< requires at least one argument')
	    case 1: return true
	    case 2: return x<y
	    default:
	    var r = x<y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x<y }
	    return r	    
	}
    },

    'poet::>' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('poet::> requires at least one argument')
	    case 1: return true
	    case 2: return x>y
	    default:
	    var r = x>y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x>y }
	    return r	    
	}
    },

    'poet::<=' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('poet::<= requires at least one argument')
	    case 1: return true
	    case 2: return x<=y
	    default:
	    var r = x<=y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x<=y }
	    return r	    
	}
    },

    'poet::>=' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('poet::>= requires at least one argument')
	    case 1: return true
	    case 2: return x>=y
	    default:
	    var r = x>=y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x>=y }
	    return r	    
	}
    },

    'poet::=' : function(x, y) {
	switch (arguments.length) {
	    case 0: throw Error('poet::< requires at least one argument')
	    case 1: return true
	    case 2: return x===y
	    default:
	    var r = x===y
	    var i = 2
	    while (i<arguments.length && r) { x=y; y=arguments[i]; r=x===y }
	    return r	    
	}
    },

    'poet::mod' : function(x, y) {
	return x % y
    },

    'poet::div' : function(x, y) {
	return Math.floor(x/y)
    },

    'poet::array?' : Array.isArray,

    'poet::list?' : function(x) {
	return x instanceof List
    },

    'poet::symbol?' : function(x) {
	return x instanceof Symbol
    },

    'poet::keyword?' : function(x) {
	return x instanceof Keyword
    },

    'poet::boolean?' : function(x) {
	return typeof x == 'boolean'
    },

    'poet::number?' : function(x) {
	return typeof x == 'number'
    },

    'poet::string?' : function(x) {
	return typeof x == 'string'
    },

    'poet::array' : function() {
	var len = arguments.length
	var arr = new Array(len)
	for (var i=0; i<len; i++) { arr[i] = arguments[i] }
	return arr
    },

    'poet::array*' : function() {
	var alen = arguments.length
	var b    = arguments[alen-1]
	var blen = b.length
	var arr = new Array(alen+blen-1)
	for (var i=0; i<alen-1; i++) { arr[i]   = arguments[i] }	
	for (var j=0; j<blen; j++)   { arr[i+j] = b[j] }
	return arr
    },

    'poet::concat' : function() {
	var res = []
	for (var i=0; i<arguments.length; i++) {
	    var xs = arguments[i]
	    if (xs) {
		for (var j=0; j<xs.length; j++) {
		    res.push(xs[j])
		}
	    }
	}
	return res
    },
   
    'poet::apply' : function(f) {
	var len  = arguments.length
	var more = arguments[len-1]
	var args = []

	for (var i=0; i<len-2; i++) {
	    args.push(arguments[i])
	}

	more.forEach(function(x) { args.push(x) })
	return f.apply(null, args)
    },   

    'poet::first'  : first,
    'poet::rest'   : rest,
    'poet::empty?' : isEmpty,
    'poet::cons'   : cons

}

function isa(obj, type) {    
    return obj == null ? false : Object(obj) instanceof type
}

function isTruthy(obj) { 
    return !(obj == null || obj === false) 
}

if (typeof process == 'undefined') {

    RT['poet::*out*'] = {
	buffer: "",

	write: function(txt) {
	    this.buffer += txt	    
	    var lines = this.buffer.split('\n')
	    for (var i=0; i<lines.length; i++) {
		if (i<lines.length-1) { 
		    console.log(lines[i]) 
		} else {
		    this.buffer = lines[i]
		}
	    }
	},

	flush: function() {
	    this.buffer.split('\n').forEach(function(line) {
		console.log(line)
	    })
	    this.buffer = ""
	}

    }

} else {

    RT['poet::*out*'] = process.stdout

}

if (typeof window != 'undefined') {
    RT['poet::window'] = window
} 

if (typeof __dirname != 'undefined') {
    var path = require('path')
    RT['poet::*load-path*'].push(path.dirname(process.argv[1]))
    RT['poet::*load-path*'].push(__dirname)
    RT['poet::slurp'] = function(filename) {
	var fs    = require('fs')
	var path  = require('path')
	var paths = RT['poet::*load-path*']
	for (var i=0; i<paths.length; i++) {
	    var abspath = path.join(paths[i], filename)
	    if (fs.existsSync(abspath)) { 
		return fs.readFileSync(abspath, 'utf8') 
	    }
	}
	throw Error('file not found: ' + filename) 
    }
}
