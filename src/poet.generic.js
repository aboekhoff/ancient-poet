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
