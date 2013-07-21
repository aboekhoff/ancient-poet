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

// getName (useful for macros)
Symbol.Simple.prototype.getName = function() {
    return this.name
}

Symbol.Qualified.prototype.getName = function() {
    return this.name
}

Symbol.Tagged.prototype.getName = function() {
    return this.symbol.getName()
}

function gensym(suffix) {
    suffix = suffix ? suffix : "G"
    var id = gensym.nextId++    
    return new Symbol.Simple("#:" + id + "-" + suffix)
}

gensym.nextId = 0

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

var INDEX_KEY   = 'poet::generic-index'
var GENERIC_KEY = 'poet::generic-key'
var DEFAULT_KEY = 'poet::generic-default'
var CUSTOM_NAME = 'poet::name'

function Generic(options) {
    options   = options || {} 
    var index = options.index || 0
    var name  = options.name  || null
    var key   = Generic.createKey(name) 

    function generic() {
	      var dispatcher = arguments[index]
	      var receiver   = dispatcher == null ? Generic.Null : dispatcher
	      var method     = receiver[key] || generic[DEFAULT_KEY]
	      return method.apply(this, arguments)
    }

    generic[INDEX_KEY]   = index
    generic[GENERIC_KEY] = key
    generic[CUSTOM_NAME] = name    
    generic[DEFAULT_KEY] = function() {
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
    var key = "poet::generic#" + this.nextId++
    return suffix ? key + ":" + suffix : key
}

Generic.addMethod = function(gfn, type, impl) {
    if (('' + type) == 'default') {
	      gfn['poet::generic-default'] = impl
    }     

    else if ((typeof type == 'function') || (type == null)) {
	      var prototype  = (type == null) ? Generic.Null : type.prototype
	      var key        = gfn['poet::generic-key']
	      prototype[key] = impl 
    }

    else if (typeof type == 'object') {
        var key   = gfn['poet::generic-key']
        type[key] = impl        
    }

    else {
        throw Error('cannot attach generic method to ' + (typeof type))
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

var cons     = Generic({name: "cons", index: 1})
var first    = Generic({name: "first"})
var rest     = Generic({name: "rest"})
var isEmpty  = Generic({name: "empty?"})
var iterator = Generic({name: "iterator"})

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

// BEGIN poet.iterable.js

function EmptyError() {
    throw Error('.next called on empty iterator')
}

function NullIterator() {}

NullIterator.prototype.hasNext = function() { 
    return false 
}

NullIterator.prototype.next = function() { 
    EmptyError() 
}

function ArrayIterator(array) {
    this.array = array
    this.index = 0
}

ArrayIterator.prototype.hasNext = function() {
    return this.index < this.array.length
}

ArrayIterator.prototype.next = function() {
    if (this.index < this.array.length) {
        return this.array[this.index++] 
    } else {
        EmptyError()
    }
}

function ListIterator(list) {
    this.list = list    
}

ListIterator.prototype.hasNext = function() {    
    return this.list instanceof List.Cons
}

ListIterator.prototype.next = function() {
    if (this.list instanceof List.Cons) {
        var elt   = this.list.head
        this.list = this.list.tail
        return elt 
    } else {
        EmptyError()
    }
}

var makeIterator = Generic({name: 'make-iterator'})

Generic.addMethods(
    makeIterator,
    'default', function(x) {
        if (x instanceof Object && 'length' in x) {
            return new ArrayIterator(x)
        }
    },
    null,   function(_)      { return new NullIterator() },
    List,   function(list)   { return new ListIterator(list) },
    String, function(string) { return new ArrayIterator(string) },
    Array,  function(array)  { return new ArrayIterator(array) }
)

if (typeof NodeList != 'undefined') {
    Generic.addMethods(
        makeIterator,
        NodeList, function(array) { return new ArrayIterator(array) }
    )
}

function forEach(func, coll) {
    var iter = makeIterator(coll)
    while (iter.hasNext()) {
        func(iter.next())
    }
}

function forEach_(func) {
    var iters = []
    var args  = []

    for (var i=1; i<arguments.length; i++) {
        iters.push(makeIterator(arguments[i]))
    }

    for (;;) {
        for (var i=0; i<iters.length; i++) {
            var iter = iters[i]
            if (!iter.hasNext()) { return }
            args[i] = iter.next()
        } 
        func.apply(null, args)
    }
}

function _reduce(f, x, iter) {
    while (iter.hasNext()) { x = f(x, iter.next()) }
    return x
}

function reduce(f, a, b) {
    switch(arguments.length) {
    case 2: 
        var iter = makeIterator(a)
        return _reduce(f, iter.next(), iter)
    case 3:
        return _reduce(f, a, makeIterator(b))
    default:
        throw Error('reduce requires exactly 2 or 3 arguments')
    }
}

function range(start, end, step) {
    var res = []

    if (arguments.length == 1) {
        end   = start;
        start = 0;
        step  = 1;
    }

    if (start < end) {
        step = step || 1
        for (var i=start; i<=end; i+=step) { res.push(i) }
    }

    else if (end < start) {
        step = step || -1
        for (var i=start; i>=end; i+=step) { res.push(i) }
    }

    return res

}


// END poet.iterable.js

// BEGIN poet.pubsub.js

var subscriptions = {}

function getSubscribers(key) {
    if (!subscriptions[key]) { subscriptions[key] = [] }
    return subscriptions[key]
}

function subscribe(key, callback) {
    var subscribers = getSubscribers(key)
    for (var i=0; i<=subscribers.length; i++) {
	if (!subscribers[i]) {
	    subscribers[i] = callback
	    callback['poet:pubsub:' + key] = i
	    return
	}
    }
}

function unsubscribe(key, callback) {
    var index       = callback['poet:pubsub:' + key]
    var subscribers = getSubscribers(key)
    subscribers[index] = null
}

function publish(key, data) {
    getSubscribers(key).forEach(function(subscriber) {
	if (subscriber) { subscriber(data) }
    })
}


// END poet.pubsub.js

// BEGIN poet.runtime.js

// poet runtime support

var RT = {

    'poet::*echo-js*'  : false,
    'poet::*echo-sexp' : false,

    'poet::*load-path*' : ["."],
    'poet::*env*'       : null,
    'poet::*out*'       : null /* defined at end of file */,
    'poet::window'      : null /* defined at end of file */,	
    
    'poet::macroexpand-1' : null,
    'poet::macroexpand'   : null,
    'poet::expand'        : null,

    'poet::List'    : List,
    'poet::Symbol'  : Symbol,
    'poet::Keyword' : Keyword,
    'poet::pr'      : pr,
    'poet::prn'     : prn,
    'poet::print'   : print,
    'poet::println' : println,
    'poet::newline' : newline,    
    'poet::Generic' : Generic,    
    'poet::gensym'  : gensym,

    'poet::for-each'  : forEach,
    'poet::for-each*' : forEach_,
    'poet::reduce'    : reduce,
    'poet::range'     : range,

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
	      case 0: throw Error('poet::= requires at least one argument')
	      case 1: return true
	      case 2: return x===y
	      default:
	          var r = x===y
	          var i = 2
	          while (i<arguments.length && r) { x=y; y=arguments[i]; r=x===y }
	          return r	    
	      }
    },

    'poet::zero?' : function(x) { return x === 0 },
    'poet::even?' : function(x) { return !(x & 1) },
    'poet::odd?'  : function(x) { return !!(x & 1) },
    'poet::inc'   : function(x) { return (x + 1) },
    'poet::dec'   : function(x) { return (x - 1) },

    'poet::mod' : function(x, y) {
	      return x % y
    },

    'poet::div' : function(x, y) {
	      return Math.floor(x/y)
    },

    'poet::instance?' : function(obj, type) {
        return obj instanceof type
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
    'poet::cons'   : cons,

    'poet::Boolean'  : Boolean,
    'poet::Number'   : Number,
    'poet::String'   : String,
    'poet::Object'   : Object,
    'poet::Function' : Function,
    'poet::Array'    : Array,
    'poet::Date'     : Date,
    'poet::RegExp'   : RegExp,
    'poet::NaN'      : NaN,
    'poet::Error'    : Error,
    'poet::Math'     : Math,

    'poet::parseInt'   : parseInt,
    'poet::parseFloat' : parseFloat,
    'poet::infinity'   : Infinity,
    'poet::-infinity'  : -Infinity,

    'poet::object' : function() {
        var obj = {}
        for (var i=0, ii = arguments.length; i<ii; i+=2) {
            obj[arguments[i]] = arguments[i+1]
        }
        return obj
    }

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

if (typeof console != 'undefined') {
    RT['poet::console'] = console
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