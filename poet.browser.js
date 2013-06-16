!(function() {

// BEGIN poet.list.js

function List() {}

List.Nil = function Nil() {} 

List.Cons = function Cons(head, tail) { 
    this.head = head; 
    this.tail = tail;
}

List.Nil.prototype = new List()
List.Cons.prototype = new List()

List.fromArray = function(array) {
    var ls = new List.Nil()
    var i = array.length
    while (i--) { ls = new List.Cons(array[i], ls) }
    return ls
}

List.create = function() {
    return List.fromArray(arguments)
}

List.Nil.prototype.isEmpty = function() { return true }
List.Cons.prototype.isEmpty = function() { return false }

List.Nil.prototype.first = function() { throw Error('Nil.first') }
List.Cons.prototype.first = function() { return this.head } 

List.Nil.prototype.rest = function() { throw Error('Nil.rest') }
List.Cons.prototype.rest = function() { return this.tail }

List.Nil.prototype.cons = function(x) { return new List.Cons(x, this) }
List.Cons.prototype.cons = function(x) { return new List.Cons(x, this) }

List.Nil.prototype.map = function(f) { return this }
List.Cons.prototype.map = function(f) { 
    return new List.Cons(f(this.head), this.tail.map(f))
}

List.Nil.prototype.filter = function(f) { return this } 
List.Cons.prototype.filter = function(f) {
    var obj  = this.head
    var keep = isTruthy(f(this.head))
    var tail = this.tail.filter(f)
    return keep ? new List.Cons(obj, tail) : tail
}

List.Nil.prototype.forEach = function(f) {}
List.Cons.prototype.forEach = function(f) {
    var ls = this
    while (ls instanceof List.Cons) { 
	f(ls.head)
	ls = ls.tail
    }
}

List.Nil.prototype.toArray = function() { return [] }
List.Cons.prototype.toArray = function() {
    var arr = []
    var ls  = this
    while (ls instanceof List.Cons) { 
	arr.push(ls.head)
	ls = ls.tail
    }
    return arr
}

List.Nil.prototype.concat = function(ls) {
    return ls
}

List.Cons.prototype.concat = function(ls) {
    return this.tail.concat(ls).cons(this.head)
}


// END poet.list.js

// BEGIN poet.symbol.js

function Symbol() {
}

Symbol.Simple = function(name) {
    this.name = name
}

Symbol.Qualified = function(namespace, name) {
    this.namespace = namespace
    this.name      = name
}

Symbol.Tagged = function(tag, symbol) { 
    this.tag    = tag
    this.symbol = symbol
}

Symbol.Tag = function(env) {
    this.env = env
    this.id  = Symbol.Tag.nextId++
} 

Symbol.Tag.nextId = 0

Symbol.Simple.prototype = new Symbol()
Symbol.Tagged.prototype = new Symbol()
Symbol.Qualified.prototype = new Symbol()

Symbol.builtin = function(name) {
    return new Symbol.Qualified('poet', name)
}

// toKey

Symbol.prototype.toKey = function() {
    return 'Symbol$' + this._toKey()
}

Symbol.Simple.prototype._toKey = function() {
    return "#" + this.name
}

Symbol.Tagged.prototype._toKey = function() {
    return this.tag.id + ":" + this.symbol._toKey()
}

Symbol.Qualified.prototype._toKey = function() {    
    // qualified symbols are resolved in the namespace
    // that corresponds to their qualifier
    // for the purposes of the compiler calls to _toKey should be errors
    throw Error('qualified symbols cannot be coerced to keys')
}

// reify

Symbol.Simple.prototype.reify = function() {
    return this
}

Symbol.Tagged.prototype.reify = function() {
    return new Symbol.Simple(this._toKey())
}

Symbol.Qualified.prototype.reify = function() {
    return new Symbol.Simple(this.name)
}

// qualify

Symbol.Simple.prototype.qualify = function(namespace) {
    return new Symbol.Qualified(namespace, this.name)
}

Symbol.Tagged.prototype.qualify = function() {
    throw Error('cannot qualify tagged symbol')
}

Symbol.Qualified.prototype.qualify = function() {
    throw Error('cannot qualify qualified symbol')
}

// toString

Symbol.Simple.prototype.toString = function() {
    return this.name
}

Symbol.Tagged.prototype.toString = function() {
    return this.symbol.toString()
}

Symbol.Qualified.prototype.toString = function() {
    return this.namespace + "::" + this.name
}

// applyTag

Symbol.Simple.prototype.applyTag = function(tag) {
    return new Symbol.Tagged(tag, this)
}

Symbol.Tagged.prototype.applyTag = function(tag) {
    return (tag == this.tag) ?
	this.symbol :
	new Symbol.Tagged(tag, this)
}


Symbol.Qualified.prototype.applyTag = function(tag) {
    return this
}

// ensureTag (for forcing symbol capture through sanitizer)

Symbol.Simple.prototype.ensureTag = function(tag) {
    return new Symbol.Tagged(tag, this)
}

Symbol.Tagged.prototype.ensureTag = function(tag) {
    return (tag == this.tag) ?
	this :
	new Symbol.Tagged(tag, this)
}


Symbol.Qualified.prototype.ensureTag = function(tag) {
    return this
}

// END poet.symbol.js

// BEGIN poet.keyword.js

// Keywords are fantastically handy creatures

function Keyword(name) {
    this.name = name
}

Keyword.interns = {}

Keyword.create = function(name) {
    if (!(name in Keyword.interns)) {
	Keyword.interns[name] = new Keyword(name)
    } 
    return Keyword.interns[name]
}

Keyword.prototype.toString = function() {
    return this.name
}

// END poet.keyword.js

// BEGIN poet.generic.js

// still not sure if we want to implement these in javascript or not
// but they make writing printers much easier

var GENERIC_KEY = 'poet::generic-key'
var DEFAULT_KEY = 'poet::generic-default'
var CUSTOM_NAME = 'poet::name'

function Generic(options) {
    var index = options.index || 0
    var name  = options.name || null
    var key   = Generic.createKey(name) 

    function generic() {
	var dispatcher = arguments[index]
	var receiver   = dispatcher == null ? Generic.Null : dispatcher
	var method     = receiver[key] || generic['poet::generic-default']
	return method.apply(this, arguments)
    }
    
    generic['poet::generic-key'] = key
    generic['poet::name'] = name    
    generic['poet::generic-default'] = function() {
	var dispatcher = arguments[index]
	var typename   = dispatcher == null ? "#nil" : dispatcher.constructor.name
	throw Error('no implementation of generic function ' + name + 
		    ' for type ' + typename)
    }

    return generic

}

Generic.Null = {}

Generic.nextId = 1

Generic.createKey = function(suffix) {
    var key = "poet::generic[" + this.nextId++ + "]"
    return suffix ? key + suffix : key
}

Generic.addMethod = function(gfn, type, impl) {
    if (('' + type) == 'default') {
	gfn['poet::generic-default'] = impl
    } 

    else {
	var prototype  = (type == null) ? Generic.Null : type.prototype
	var key        = gfn['poet::generic-key']
	prototype[key] = impl 
    }
} 

Generic.addMethods = function(gfn) {
    for (var i=1; i<arguments.length;) {
	Generic.addMethod(gfn, arguments[i++], arguments[i++])
    }
    return gfn
}

var _print = Generic({ name: "print*" })

function _print_sequence(xs, p, e, sep) {
    sep = sep || " "    
    var flag = false
    for (var i=0; i<xs.length; i++) {
	if (flag) { p.write(sep) } else { flag = true }
	_print(xs[i], p, e)
    }
}

Generic.addMethods(
    _print,

    'default', function(x, p, e) {
	var cnst = x.constructor
	var name = cnst ? cnst['poet::name'] || cnst.name : null
	name = name || 'Object'
	p.write("#<" + name + ">")
    },

    null, function(x, p, e) {
	p.write("#nil")
    },

    Boolean, function(x, p, e) {
	p.write(x.valueOf() ? "#t" : "#f")
    },

    Number, function(x, p, e) {
	p.write(x.toString())
    },    

    String, function(x, p, e) {
	p.write(e ? JSON.stringify(x) : x.valueOf())
    },

    Function, function(x, p, e) {
	p.write("#<fn")
	var name = x['poet::name'] || x.name
	if (name) { p.write(":" + name) }
	p.write(">")
    },

    Array, function(xs, p, e) {
	p.write("[")
	_print_sequence(xs, p, e)
	p.write("]")
    },

    List.Nil, function(xs, p, e) {
	p.write("()")
    },

    List.Cons, function(xs, p, e) {
	var head = xs.first()

	if (head instanceof Symbol.Qualified &&
	    head.namespace == 'poet' &&
	    head.name == 'quote') {
	    p.write("'")
	    _print(xs.rest().first(), p, e)
	} 

	else {
	    p.write("(")
	    _print_sequence(xs.toArray(), p, e)
	    p.write(")")	
	}

    },

    Symbol.Qualified, function(x, p, e) {
	p.write("##" + x.namespace + "#" + x.name)
    },

    Symbol.Tagged, function(x, p, e) {
	_print(x.symbol, p, e)
    },

    Symbol.Simple, function(x, p, e) {
	p.write(x.name)
    },

    Keyword, function(x, p, e) {
	p.write(":" + x.name)
    }

)

function newline() {
    RT['poet::*out*'].write('\n')
}

function pr() {
    _print_sequence(arguments, RT['poet::*out*'], true)
}

function prn() {
    _print_sequence(arguments, RT['poet::*out*'], true)
    newline()
}

function print() {
    _print_sequence(arguments, RT['poet::*out*'], false)
}

function println() {
    _print_sequence(arguments, RT['poet::*out*'], false)
    newline()
}

// list functions

var cons    = Generic({name: "cons", index: 1})
var first   = Generic({name: "first"})
var rest    = Generic({name: "rest"})
var isEmpty = Generic({name: "empty?"})

Generic.addMethods(
    cons,
    null, function(x, xs) { return List.create(x) },
    List, function(x, xs) { return new List.Cons(x, xs) },
    Array, function(x, xs) { return new List.Cons(x, List.fromArray(xs)) }
)

Generic.addMethods(
    first,
    List.Cons, function(x) { return x.head },
    Array,     function(x) { return x[0] }
)

Generic.addMethods(
    rest,
    List.Cons, function(x) { return x.tail },
    Array, function(x) { 
	var ls = new List.Nil
	var i = x.length
	while (i>1) { i--; ls = new List.Cons(x[i], ls) }
	return ls
    }
)

Generic.addMethods(
    isEmpty,
    null, function(_) { return true },
    List.Nil, function(_) { return true },
    List.Cons, function(x) { return false },    
    Array, function(x) { return x.length == 0 }
)



// END poet.generic.js

// BEGIN poet.runtime.js

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

// END poet.runtime.js

window.RT = RT

})()