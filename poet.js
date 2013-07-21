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

// BEGIN poet.dict.js

// extensible dictionaries (linked lists of maps)
// are useful for representing environments

function Dict(bindings, parent) {
    this.bindings = bindings || {}
    this.parent   = parent   || null
}

Dict.create = function() {
    return new Dict({}, null)
}

Dict.prototype = {
    seek: function(key) {
	var dict = this
	var key  = '' + key
	while (dict) {
	    if (key in dict.bindings) {
		return dict.bindings
	    } else {
		dict = dict.parent
	    }
	}
	return null
    },

    has: function(key) {
	return !!this.seek(key)
    },

    get: function(key, notFound) {
	var bindings = this.seek(key)
	return bindings ? bindings[key] : notFound
    },

    put: function(key, val) {
	this.bindings[key] = val
    },

    extend: function() {
	return new Dict({}, this)
    }

}




// END poet.dict.js

// BEGIN poet.env.js

function Env(dict, name) {
    this.dict = dict
    this.name = name
}

Env.SYMBOL_PREFIX = "S:"
Env.LABEL_PREFIX  = "L:"

Env.registry = {}

Env.create = function(name) {
    var env = Env.registry[name] = new Env(new Dict(), name)
    env.putSymbol(new Symbol.Simple('require'), 'require')
    return env
}

Env.findOrCreate = function(name) {
    if (!Env.registry[name]) { Env.create(name) }        
    return Env.registry[name]
}

Env.findOrDie = function(name) {
    if (!Env.registry[name]) {
	Env.load(name)
    }
    return Env.registry[name]
}

Env.load = function(name) {
    name = Env.nameToModule(name)
    if (!Env.registry[name]) { Env.reload(name) }
    return Env.registry[name]
}

Env.reload = function(name) {
    var fs   = require('fs')
    var file = Env.nameToFile(name)
    var src  = RT['poet::slurp'](file)
    var env  = Env.findOrCreate(name)
    loadTopLevel({
	src    : src,
	origin : file,
	env    : env
    })
    return env
}

Env.nameToModule = function(name) {
    return /\.poet$/.test(name) ? name.replace(/\.poet$/, '') : name
}

Env.nameToFile = function(name) {
    return /\.poet$/.test(name) ? name : name + ".poet"
}

Env.toKey = function(obj) {
    if (obj == null) { return '' + obj }
    if (obj.toKey)   { return obj.toKey() }
    else             { return obj.constructor.name + "$" + obj.toString() }
}

Env.prototype = {
    addExport: function(symbol) {	
	this.exports = this.exports || []
	this.exports.push(symbol)
    },

    extend: function() {
	return new Env(this.dict.extend(), this.name)
    },

    getWithPrefix: function(prefix, object, notFound) {	
	// qualified symbols are resolved in their own namespace	

	if (object instanceof Symbol.Qualified) {
	    return Env.
		findOrDie(object.namespace).
		getWithPrefix(prefix, new Symbol.Simple(object.name), notFound)	
	}

	// lookup all other objects as usual

	var key      = prefix + Env.toKey(object)
	var bindings = this.dict.seek(key)

	if (bindings) { 
	    return bindings[key] 
	}
	
	// when no binding is found and the object
	// is a tagged symbol, pull the environment and child symbol
	// from the tagged symbol and recurse

	if (object instanceof Symbol.Tagged) {
	    return object.tag.env.getWithPrefix(prefix, object.symbol, notFound)
	}

	// otherwise we give up

	else {
	    return notFound
	}

    },

    putWithPrefix: function(prefix, object, value) {
	this.dict.put(prefix + Env.toKey(object), value)
    },

    getSymbol: function(symbol, notFound) {
	return this.getWithPrefix(Env.SYMBOL_PREFIX, symbol, notFound)	
    },

    putSymbol: function(symbol, value) {
	this.putWithPrefix(Env.SYMBOL_PREFIX, symbol, value)
    },

    getLabel: function(label, notFound) {
	return this.getWithPrefix(Env.LABEL_PREFIX, label, notFound)
    },

    putLabel: function(label, value) {
	this.putWithPrefix(Env.LABEL_PREFIX, label, value)
    },

    createSanitizers: function() {
	var tag = new Symbol.Tag(this)    
	
	function applyTag(sexp) {
	    if (sexp instanceof Symbol) {
		return sexp.applyTag(tag)
	    }

	    if (sexp instanceof Array || sexp instanceof List) {
		var _sexp = sexp.map(applyTag)
		if (sexp['source-position']) {
		    _sexp['source-position'] = sexp['source-position']
		}	
		return _sexp
	    }

	    else {
		return sexp
	    }

	}

	function ensureTag(sexp) {
	    if (sexp instanceof Symbol) {
		return sexp.ensureTag(tag)
	    }

	    if (sexp instanceof Array || sexp instanceof List) {
		var _sexp = sexp.map(ensureTag)
		if (sexp['source-position']) {
		    _sexp['source-position'] = sexp['source-position']
		}
		return _sexp
	    }

	    else {
		return sexp
	    }

	}

	return {
	    tag      : tag,
	    sanitize : applyTag,
	    capture  : ensureTag
	}
    }

}

// END poet.env.js

// BEGIN poet.reader.js

// FIXME (add back support for qualified symbols and keywords)

function Position(offset, line, column, origin) {
    this.offset = offset;
    this.line   = line;
    this.column = column;
    this.origin = origin;
}

Position.prototype.toString = function() {
    return "line " + this.line   + ", " +
	      "column " + this.column + ", " +
	      "of "     + (this.origin || "unknown location");
};

function Reader() {	
    this.input  = null;
    this.offset = 0;
    this.line   = 1;
    this.column = 1;
    this.origin = "unknown";
}

Reader.create = function(options) {
    var reader   = new Reader();
    options = options || {}
    reader.input  = options.input  || null
    reader.origin = options.origin || null
    return reader;
}

Reader.hexRegex    = /^0(x|X)[0-9a-fA-F]+/;
Reader.octRegex    = /^0[0-7]+/;
Reader.intRegex    = /^(0)|[1-9][0-9]*/;
Reader.floatRegex  = /^((0)|[1-9][0-9]*)\.[0-9]+/;
Reader.binaryRegex = /^0(b|B)[01]+/;

Reader.escapeMap = {
    'n'  : '\n',
    'r'  : '\r',
    'f'  : '\f',
    'b'  : '\b',
    't'  : '\t',
    '"'  : '"',
    '\\' : '\\'
};

Reader.notTerminal = function(c) {
    switch (c) {
    case ' ':
    case '\t':
    case '\n':
    case '\r':
    case '\f':
    case ';':
    case '(':
    case ')':
    case '[':
    case ']':
    case '{':
    case '}':
    case '"':
    case "'":
    case '`':
	      return false;
    default:
	      return true;
    }
};

Reader.prototype = {
    constructor: Reader,

    makeList: function(list, position) {
	      list = List.fromArray(list)
	      if (position) { list['source-position'] = position }
	      return list
    },

    makeArray: function(array, position) {
	      if (position) { array['source-position'] = position }
	      return array
    },

    reset: function(input, origin) {
	      this.input  = input;
	      this.origin = origin;
	      this.offset = 0;
	      this.line   = 1;
	      this.column = 1;
    },

    loadPosition: function(position) {
	      this.offset = position.offset;
	      this.line   = position.line;
	      this.column = position.column;
	      this.origin = position.origin;		
    },

    getPosition: function() {
	      return new Position(
	          this.offset,
	          this.line,
	          this.column,
	          this.origin
	      );
    },

    isEmpty: function() {
	      this.readWhitespace();
	      return this.offset >= this.input.length;
    },

    peek: function() {
	      return this.input[this.offset];
    },

    pop: function() {
	      var c = this.peek();
	      this.offset++;

	      switch(c) {
	      case '\n':
	      case '\r':
	      case '\f':	    
	          this.line++
	          this.column = 1
	          break
	      default:
	          this.column++
	      }

	      return c;
    },

    popWhile: function(pred) {
	      var s = [];
	      for(;;) {
	          var c = this.peek();
	          if (c == null || !pred(c)) { break; }
	          s.push(this.pop());
	      }
	      return s.join("");
    },

    readWhitespace: function() {
	      var inComment = false;
	      loop:for(;;) {
	          var c = this.peek();
	          if (c == null) { return; }

	          switch(c) {
	          case ';' : 
		            inComment = true; 
		            this.pop(); 
		            continue loop;

	          case '\n': 
	          case '\r':
	          case '\f': 
		            inComment = false;

	          case ' ' :
	          case '\t':
		            this.pop();
		            continue loop;

	          default:
		            if (inComment) { 
		                this.pop(); 
		            } else {
		                return;
		            }
		            
	          }
	      }
    },

    read: function() {
	      this.readWhitespace();
	      var pos  = this.getPosition()
	      var sexp = this.readSexp()
	      publish('poet:read', { sexp: sexp, position: pos})
	      return sexp
    },

    readSexp: function() {
	      this.readWhitespace();

	      var nextChar = this.peek();

	      switch (nextChar) {
	      case ')': this.syntaxError('unmatched closing paren');
	      case ']': this.syntaxError('unmatched closing brace');
	      case '(': return this.readList();
	      case '[': return this.readArray();
        case '{': return this.readObject();
	      case '"': return this.readString();
	      case "'": return this.readQuote();
	      case ',': return this.readUnquote();
	      case '`': return this.readQuasiquote();
	      default:  return this.readAtom();
	      }
    },

    readQuote: function() {
	      var position = this.getPosition();
	      this.pop();
	      return this.makeList(
	          [Symbol.builtin('quote', position),
	           this.readSexp()], 
	          position);
    },

    readQuasiquote: function() {
	      var position = this.getPosition();
	      this.pop();
	      return this.makeList(
	          [Symbol.builtin('quasiquote'),
	           this.readSexp()],
	          position);		
    },

    readUnquote: function() {
	      var position = this.getPosition();
	      var name     = 'unquote';
	      this.pop();

	      if (this.peek() == '@') {
	          this.pop();
	          name = 'unquote-splicing';
	      }				

	      return this.makeList(
	          [Symbol.builtin(name), this.readSexp()]
	      )

    },

    readObject: function() {
	      var position = this.getPosition();		
	      var list     = [];
	      this.pop();

	      loop:for(;;) {			
	          this.readWhitespace();
	          var c = this.peek();
	          switch(c) {

	          case null: 
		            this.error('unclosed object-literal', position);
		            
	          case '}': 
		            this.pop(); 
		            break loop;

	          default: 
		            list.push(this.readSexp()); continue loop;
	          }
	      }

        return List.fromArray(list).cons(Symbol.builtin('object'))

    },

    readArray: function() {
	      var position = this.getPosition();		
	      var list     = [];
	      this.pop();

	      loop:for(;;) {			
	          this.readWhitespace();
	          var c = this.peek();
	          switch(c) {

	          case null: 
		            this.error('unclosed array-literal', position);
		            
	          case ']': 
		            this.pop(); 
		            return this.makeArray(list, position);

	          default: 
		            list.push(this.readSexp()); continue loop;
	          }
	      }
    },

    readList: function() {
	      var position = this.getPosition();		
	      var list     = [];
	      this.pop();

	      loop:for(;;) {			
	          this.readWhitespace();
	          var c = this.peek();
	          switch(c) {
	          case null: 
		            this.error('unclosed list', position);

	          case ')': 
		            this.pop(); return this.makeList(list, position);

	          default: 
		            list.push(this.readSexp()); continue loop;
	          }
	      }
    },

    readString: function() {
	      var position = this.getPosition();
	      var string   = [];
	      this.pop();
	      loop:for(;;) {
	          var c = this.pop();
	          switch(c) {
	          case null: this.error('unclosed string literal', position);
	          case '"' : return string.join("");
	          case '\\':
		            var position2 = this.getPosition();
		            var cc = Reader.escapeMap[this.pop()];
		            if (!cc) { this.error('invalid escape character', position2); }
		            string.push(cc);
		            continue;
	          default:
		            string.push(c);
		            continue;
	          }
	      }
    },

    parseNumber: function(string, position) {
	      var sign = 1;
	      if (string[0] == '-') {
	          sign   = -1;
	          string = string.substring(1);
	      }

	      switch (true) {
	      case Reader.octRegex.test(string) : 
            return sign * parseInt(string.substring(1), 8);

	      case Reader.floatRegex.test(string) : 
            return sign * parseFloat(string);

	      case Reader.intRegex.test(string) : 
            return sign * parseInt(string, 10);

	      case Reader.hexRegex.test(string) : 
            return sign * parseInt(string.substring(2), 16);

	      case Reader.binaryRegex.test(string) : 
            return sign * parseInt(string.substring(2), 2);

	      default:
	          throw Error('invalid number literal at ' + position);
	      }
    },

    // add in foo.bar.baz reader macro   

    parseSymbol: function(string, position) {
	      if (string[0] == ":") {
	          return Keyword.create(string.substring(1))
	      }

	      if (/[^\.]+(\.[^\.]+)+/.test(string)) {
	          var segs = string.split('.')
	          var root = this.parseSymbol(segs[0], position)
	          for (var i=1; i<segs.length; i++) {
		            root = List.create(
		                Symbol.builtin('.'),
		                root,
		                segs[i]
		            )
	          }
	          root['source-position'] = position
	          return root
	      }

	      else if (/##[^#]+#[^#]+/.test(string)) {
	          var segments = string.substring(2).split(/#/)
	          return new Symbol.Qualified(segments[0], segments[1])
	      }

	      else {
	          return new Symbol.Simple(string)
	      }
	      
    },

    readAtom: function() {
	      var position = this.getPosition();
	      var string   = this.popWhile(Reader.notTerminal);

	      switch (string) {
	      case '#t'    : return true;
	      case '#f'    : return false;
	      case '#nil'  : return null;
	          // case '#void' : return undefined;	    
	      }	

	      if (/^(\d|(-\d))/.test(string)) {
	          return this.parseNumber(string, position);
	      } else {
	          return this.parseSymbol(string, position);
	      }

    }    

};


// END poet.reader.js

// BEGIN poet.expander.js

function expand(e, x) {
    var sexp = expandSexp(e, x)
    publish('poet:expand', sexp)
    return sexp
}

function macroexpand1(e, x) {
    var macro = maybeResolveToMacro(e, x)
    return macro ? macro(x, e) : x
}

function macroexpand(e, x1) {
    var x2 = macroexpand1(e, x1)
    return x1 === x2 ? x2 : macroexpand(e, x2)   
}

function maybeResolveToMacro(e, x) {
    return maybeResolveToFunctionMacro(e, x) || maybeResolveToSymbolMacro(e, x)
}

function maybeResolveToFunctionMacro(e, x) {
    if (x instanceof List.Cons &&	x.first() instanceof Symbol) {
  	    var denotation = e.getSymbol(x.first())
  	    if (typeof denotation == 'function') {
	          return denotation
	      }
    }    
    return null
}

// FIXME
function maybeResolveToSymbolMacro(e, x) {  
    if (x instanceof Symbol) {
        var denotation = e.getSymbol(x);    
        if (typeof denotation == 'function' && denotation['symbol-macro']) {
            return denotation
        }
    }
    return null
}

function maybeResolveToSpecialForm(e, x) {
    if (x instanceof List.Cons && (x.first() instanceof Symbol)) {
  	    var denotation = e.getSymbol(x.first())
	      if (typeof denotation == 'string') {
	          return denotation
  	    }
    }    
    return null
}

function maybeResolveToBegin(e, x) {
    return maybeResolveToSpecialForm(e, x) == 'begin'
}

function maybeResolveToDefine(e, x) {
    return maybeResolveToSpecialForm(e, x) == 'define*'
}

function maybeResolveToDefineMacro(e, x) {
    return maybeResolveToSpecialForm(e, x) == 'define-macro*'
}

function bindLabel(e, x) {
    var _x = x instanceof Symbol ? x.reify() : x
    e.putLabel(x, _x)
    return _x
}

function bindLocal(e, s) {
    var rs = s.reify()
    e.putSymbol(s, rs)
    return rs
}

function bindGlobal(e, s) {
    var rs      = s.reify()
    var qs      = rs.qualify(e.name)
    var rootEnv = Env.findOrDie(e.name)
    rootEnv.putSymbol(s, qs)
    rootEnv.addExport(rs)    
    return qs
}

function bindMacro(e, s, m) {
    var rs = s.reify()
    e = Env.findOrDie(e.name)
    e.putSymbol(rs, m)
    e.addExport(rs)
    return rs
}

function expandSexp(e, x) {
    x = macroexpand(e, x)

    if (x instanceof Symbol) {
  	    return expandSymbol(e, x)
    }

    if (x instanceof List) {
	      return expandList(e, x)
    }

    if (x instanceof Array) {
	      return expandSexps(e, x)
    }

    else {
	      return x
    }
}

function expandSexps(e, xs) {
    return xs.map(function(x) { return expandSexp(e, x) })
}

function expandSymbol(e, s) {
    var denotation = e.getSymbol(s)

    switch (typeof denotation) {
    case 'string'   : throw Error("can't take value of special form: " + s)
    case 'function' : throw Error("can't take value of macro: " + s)
    default:  
	      if (denotation) { return denotation }
	      if (s instanceof Symbol.Qualified) { return s }
	      else { return bindGlobal(e, s) }	    
    }

}

function expandLabel(e, l) {
    var denotation = e.getLabel(l)
    if (typeof denotation == 'undefined') {
	      throw Error('label not in scope: ' + l)
    }
    else {
	      return denotation
    }
}

function expandList(e, x) {
    var n = maybeResolveToSpecialForm(e, x)
    return n ? expandSpecialForm(e, x, n) : expandCall(e, x)
}

function isFrontDotted(x) {
    return (x instanceof Symbol) &&
	      (/^\.[^\.]/.test(x.getName())) 	
}

function expandCall(e, x) {
    if (isFrontDotted(x.first())) {
	      return expandFrontDottedList(e, x)
    } else {
	      return expandSexps(e, x)
    }
}

function expandFrontDottedList(e, x) {
    var method   = x.first().getName().substring(1)
    var receiver = expandSexp(e, x.rest().first())
    var args     = expandSexps(e, x.rest().rest())

    var proj = List.create(
	      Symbol.builtin('.'),
	      receiver,
	      method
    )

    return args.cons(proj)

}

// internal body expansion helpers
// first splice together any begin forms

function expandBody(e, xs) {
    var exprs = []
    var defs  = []
    var mode  = 'definition'
    var x

    loop:while (!xs.isEmpty()) {	

	      x  = macroexpand(e, xs.first())
	      xs = xs.rest()

	      // if it's a begin form we splice in the expressions and continue

	      if (maybeResolveToBegin(e, x)) {
	          xs = x.rest().concat(xs)
	          continue loop
	      }

	      if (maybeResolveToDefine(e, x)) {
	          if (mode == 'definition') {
		            var sym  = x.rest().first()
		            var expr = x.rest().rest().first() 
		            
		            sym = bindLocal(e, sym)	
		            defs.push(List.create(sym, expr))
		            continue loop

	          } else {
		            exprs.push(expandBody(e, xs.cons(x)))
		            break loop
	          }
	      }


	      {	    
	          mode = 'expression'
	          exprs.push(expandSexp(e, x))
	          continue loop
	      }

    }    

    var body;

    switch(exprs.length) {
    case 0:  body = null
    case 1:  body = exprs[0]
    default: body = List.fromArray(exprs).cons(Symbol.builtin('begin'))
    }

    if (defs.length > 0) {
	      defs = defs.map(function(pair) {
	          var sym  = pair.first()
	          var expr = pair.rest().first()
	          return List.create(sym, expandSexp(e, expr))
	      })

	      return List.create(
	          Symbol.builtin('letrec*'),
	          List.fromArray(defs),
	          body
	      )
    }

    else {
	      return body
    }

}

function expandFn(e, args, body) {
    e = e.extend()

    args = args.map(function(arg) {
	      return arg instanceof Symbol ?
	          bindLocal(e, arg) :
	          arg
    })

    body = expandBody(e, body)

    return List.create(Symbol.builtin('fn*'), args, body)
    
}

function expandLet(e, bindings, body) {
    e = e.extend()

    if (bindings instanceof List.Cons) {

	      bindings = bindings.map(function(binding) {
	          var sym  = binding.first()
	          var expr = binding.rest().first()
	          expr = expandSexp(e, expr)
	          sym  = bindLocal(e, sym)
	          return List.create(sym, expr)
	      }) 
        
    }

    body = expandBody(e, body)
    
    return List.create(
	      Symbol.builtin('let*'),
	      bindings,
	      body
    )
    
}

function expandLetrec(e, bindings, body) {
    e = e.extend()

    if (bindings instanceof List.Cons) {

	      bindings = bindings.map(function(binding) {
	          var sym  = binding.first()
	          var expr = binding.rest().first()
	          sym      = bindLocal(e, sym)
	          return List.create(sym, expr)
	      })

	      bindings = bindings.map(function(binding) {
	          var sym  = binding.first()
	          var expr = binding.rest().first()
	          expr     = expandSexp(e, expr)
	          return List.create(sym, expr)
	      })

    }

    body = expandBody(e, body)

    if (bindings instanceof List.Cons) {
	      return List.create(Symbol.builtin('letrec*'), bindings, body)
    }

    else {
	      return body
    }

}

function expandQuasiquote(e, x) {

    function isQuasiquote(x) {
	      return maybeResolveToSpecialForm(e, x) == 'quasiquote'
    }

    function isUnquote(x) {
	      return maybeResolveToSpecialForm(e, x) == 'unquote'
    }

    function isUnquoteSplicing(x) {
	      return maybeResolveToSpecialForm(e, x) == 'unquote-splicing'
    }

    function kwote(x) {
	      return List.create(Symbol.builtin('quote'), x)
    }

    function qa(x) {
	      return List.fromArray(x.map(qq)).cons(Symbol.builtin('acat'))
    }

    function q(x) {

	      if (isUnquote(x)) {
	          return x.rest().first()
	      }

	      if (isQuasiquote(x)) {
	          return kwote(
		            List.create(
		                Symbol.builtin('quasiquote'),
		                x.rest().first()
		            )
	          )
	      }

	      if (x instanceof Symbol) {
	          return kwote(x)
	      }

	      if (x instanceof List) {	    
	          return List.create(
		            Symbol.builtin('array->list'),
		            qa(x.toArray())
	          )
	          return x.map(q)
	      }

	      if (x instanceof Array) {
	          return qa(x)
	      }

	      else {
	          return x
	      }
	      

    }

    function qq(x) {
	      if (isUnquoteSplicing(x)) {
	          return x.rest().first()
	      }

	      else {
	          return [q(x)]
	      }

    }

    if (isUnquoteSplicing(x)) {
	      return x.rest().first()
    }

    else {
	      return q(x)
    }


}

// not much to do other than validate
// the prefix keys

// (unwind-protect (:try ...) (:catch (e) ...) (:finally ...))

function expandUnwindProtect(e, xs) {
    var ys = []
    
    var VALID_KEYS = [
	      Keyword.create('try'), 
	      Keyword.create('catch'), 
	      Keyword.create('finally')
    ]

    function validate(key) {
	      if (VALID_KEYS.indexOf(key) == -1) {
	          throw Error('invalid key in unwind protect')
	      }
    }   

    xs.rest().forEach(function(x) {
	      var key  = x.first()
	      var body = x.rest()
	      validate(key)

	      // if catch
	      if (key == VALID_KEYS[1]) {
	          var _e    = e.extend()	
	          var local = bindLocal(e, body.first().first())
	          body  = expandBody(_e, body.rest())
	          
	          ys.push(List.create(key, List.create(local), body))	    	    
	      } else {
	          ys.push(List.create(key, expandBody(e, body)))
	      }
    })

    return List.fromArray(ys).cons(Symbol.builtin('unwind-protect'))
    
}


function expandSpecialForm(e, x, n) {

    switch (n) {

    case 'define*':
	      throw Error('define* in expression context')

    case 'define-macro*':
	      throw Error('define-macro* outside of top-level')

    case 'quote':
	      return List.create(
	          Symbol.builtin('quote'),
	          x.rest().first()
	      )

    case 'quasiquote':
	      var tmp = expandQuasiquote(e, x.rest().first())	
	      var res = expandSexp(e, tmp)
	      return res

    case 'unquote':
	      throw Error('unquote outside of quasiquote')

    case 'unquote-splicing':
	      throw Error('unquote-splicing outside of quasiquote')

    case 'fn*':
	      return expandFn(e, x.rest().first(), x.rest().rest())

    case 'begin':
	      return expandBody(e, x.rest())

    case 'if':
	      return expandSexps(e, x.rest()).cons(Symbol.builtin('if'))

    case 'new':
        return expandSexps(e, x.rest()).cons(Symbol.builtin('new'))

    case 'set!':
	      return expandSexps(e, x.rest()).cons(Symbol.builtin('set!'))

    case '.':
	      return expandSexps(e, x.rest()).cons(Symbol.builtin('.'))

    case 'let*':
	      return expandLet(e, x.rest().first(), x.rest().rest())

    case 'letrec*':
	      return expandLetrec(e, x.rest().first(), x.rest().rest())

    case 'block':
	      e = e.extend()
	      var label = bindLabel(e, x.rest().first())
	      var body  = expandBody(e, x.rest().rest())
	      return List.create(
	          Symbol.builtin('block'),
	          label,
	          body
	      )

    case 'loop':
	      e = e.extend()
	      bindLabel(e, null)
	      var body = expandBody(e, x.rest())
	      return List.create(Symbol.builtin('loop'), body)

    case 'return-from':
	      return List.create(
	          Symbol.builtin('return-from'),
	          expandLabel(e, x.rest().first()),
	          expandSexp(e, x.rest().rest().first())
	      )

    case 'throw':
	      return List.create(
	          Symbol.builtin('throw'),
	          expandSexp(e, x.rest().first())
	      )

    case 'unwind-protect':
	      return expandUnwindProtect(e, x)

    case 'js*':
	      return List.create(
	          Symbol.builtin('js*'),
	          expandSexp(e, x.rest().first())
	      )

    case 'require':
	      var options = {}
	      var name    = x.rest().first().toString()
	      var args    = x.rest().rest().toArray()
	      var env     = Env.findOrDie(name)
	      var exports = env.exports

	      for (var i=0; i<args.length; i+=2) {
	          options[args[i]] = args[i+1]
	      }

	      options.prefix = options.prefix || ""

	      if (options.only) {
	          var names = {}
	          options.only.forEach(function(x) {names[x] = true })
	          var accept = function(sym) {
		            return !!names[sym]
	          }
	      }

	      else if (options.exclude) {	    
	          var names = {}
	          options.except.forEach(function(x) {name[x] = true})
	          var accept = function(sym) {
		            return !names[sym]
	          }
	      }

	      else {
	          var accept = function(x) { return true }
	      }

	      for (var i=0; i<exports.length; i++) {	    
	          var symbol = exports[i]
	          if (accept(symbol)) {
		            var denotation = env.getSymbol(symbol)
		            var alias      = new Symbol.Simple(options.prefix + symbol)
		            e.putSymbol(alias, denotation)
	          }	    
	      }

	      return namespace + " required"

    default:
        throw Error('unhandled special form: ' + n)

    }

}


// END poet.expander.js

// BEGIN poet.normalizer.js

// transforms the adhoc s-expression trees into
// faux tagged unions of the form [TAG data_1 ... data_n]
// so that the compiler can focus on semantics
// also does some final conversion of quoted symbols and keyword literals

function normalize(sexp) {
    var nsexp = normalizeSexp(sexp)
    publish('poet:normalize', nsexp)
    return nsexp
}

function maybeBuiltin(obj) {
    return obj instanceof Symbol.Qualified &&
	      obj.namespace == 'poet'
}

function normalizeUnwindProtect(clauses) {     
    var map = {}
    clauses.forEach(function(clause) {	
	      var key  = clause.first()
	      if (key == Keyword.create('catch')) {
	          var loc  = normalize(clause.rest().first().first())
	          var expr = normalize(clause.rest().rest().first())
	          map[key] = [loc, expr] 
	      } else {
	          var expr = normalize(clause.rest().first())
	          map[key] = expr
	      }
    })
    var res = ['UNWIND_PROTECT', map]
    return res
}

function normalizeQuote(x) {
    if (x instanceof Symbol.Qualified) {
	      return ['CALL',
		            ['GLOBAL', 'poet', 'symbol'],
		            [['CONST', x.namespace],
		             ['CONST', x.name]]]	    	
    }

    if (x instanceof Symbol.Simple) {
	      return ['CALL',
		            ['GLOBAL', 'poet', 'symbol'],
		            [['CONST', x.name]]]
    }

    if (x instanceof Symbol.Tagged) {
	      // it may make sense to reify and normalize tagged symbols
	      // will need to see in what situations this arises
	      throw Error('tagged symbol in normalizer')
    }

    if (x instanceof Array) {
	      return ['ARRAY', x.map(normalizeQuote)]
    }
    
    if (x instanceof List) {
	      return ['CALL', 
		            ['GLOBAL', 'poet', 'list'],
		            x.map(normalizeQuote).toArray()]
    }

    else {
	      return normalizeSexp(x)
    }

}

function normalizeBinding(pair) {
    return [normalizeSexp(pair.first()), normalizeSexp(pair.rest().first())]
}

function normalizeBindings(bindings) {
    return bindings.map(normalizeBinding).toArray()
}

function normalizeSeq(seq) {
    return seq.map(normalizeSexp)
}

function normalizeLabel(obj) {
    return ['LABEL', Env.toKey(obj)]
}

function normalizeFn(args, body) {
    body = normalizeSexp(body)

    var pargs = []
    var rest  = null
    var self  = null

    var i=0;
    while(i<args.length) {
	      var arg = args[i++]

	      if (arg instanceof Symbol) {
	          pargs.push(normalizeSexp(arg))
	      } 

	      if (arg instanceof Keyword) {
	          var key = arg
	          var arg = normalizeSexp(args[i++])
	          switch (key.name) {
	          case '&':
		            rest = arg
		            break
	          case 'this':
		            self = arg
		            break
	          }
	      }
    }        

    if (rest || self) {
	      body = [body]
	      if (rest) { body.unshift(['RESTARGS', rest, pargs.length]) }
	      if (self) { body.unshift(['THIS', self]) }
	      body = ['BEGIN', body]
    }

    // console.log(pargs)
    // console.log(body)

    return ['FUN', pargs, body]

}

var NULL_LABEL = normalizeLabel(null)

function normalizeSexp(sexp) {
    if (sexp instanceof Keyword) {
	      return ['KEYWORD', sexp.name]
    }

    if (sexp instanceof Symbol.Simple) {
	      return ['LOCAL', sexp.name]
    }     

    if (sexp instanceof Symbol.Qualified) {
	      return ['GLOBAL', sexp.namespace, sexp.name]
    }

    if (sexp instanceof Symbol.Tagged) {
	      throw Error('tagged symbol reached normalizer')
    }

    if (sexp instanceof Array) {
	      return ['ARRAY', normalizeSeq(sexp)]
    }

    if (!(sexp instanceof List)) {
	      return ['CONST', sexp]
    }

    // list

    sexp = sexp.toArray()

    if (maybeBuiltin(sexp[0])) {

	      switch(sexp[0].name) {

	      case 'quote':
	          return normalizeQuote(sexp[1])

	      case '.':
	          var node = normalizeSexp(sexp[1])
	          for (var i=2; i<sexp.length; i++) {
		            node = ['PROPERTY', node, normalizeSexp(sexp[i])]
	          }
	          return node

	      case 'fn*': 
	          // console.log(sexp)
	          return normalizeFn(sexp[1].toArray(), sexp[2])

	      case 'begin' : 
	          return ['BEGIN', normalizeSeq(sexp.slice(1))]

	      case 'if' : 
	          return ['IF', 
		                normalizeSexp(sexp[1]), 
		                normalizeSexp(sexp[2]),
		                normalizeSexp(sexp[3])]

	      case 'let*' :
	          return ['LET',
		                normalizeBindings(sexp[1]),
		                normalizeSexp(sexp[2])]

	      case 'letrec*' :
	          return ['LETREC',
		                normalizeBindings(sexp[1]),
		                normalizeSexp(sexp[2])]

	      case 'unwind-protect' :
	          return normalizeUnwindProtect(sexp.slice(1))
	          
	      case 'set!' :
	          return ['SET', normalizeSexp(sexp[1]), normalizeSexp(sexp[2])]

	      case 'loop' : 
	          return ['LOOP', normalizeSexp(sexp[1])]

	      case 'block' : 
	          return ['BLOCK', 
		                normalizeLabel(sexp[1]), 
		                normalizeSexp(sexp[2])]
	          
	      case 'return-from':
	          return ['RETURN_FROM', 
		                normalizeLabel(sexp[1]), 
		                normalizeSexp(sexp[2])]

	      case 'throw':
	          return ['THROW', normalizeSexp(sexp[1])]

	      case 'js*':
	          return ['RAW', sexp[1]]

	      case 'new':
	          return ['NEW', normalizeSexp(sexp[1]), normalizeSeq(sexp.slice(2))]

	      }   
    }

    return ['CALL', normalizeSexp(sexp[0]), normalizeSeq(sexp.slice(1))]

}

// END poet.normalizer.js

// BEGIN poet.compiler.js

function compile(normalizedSexp, wantReturn) {
    var ast = Context.compile(normalizedSexp, wantReturn)
    publish('poet:compile', ast)
    return ast
}

function tracerFor(node) {    
    function tracer(val) {
	      tracer.traced = true
	      return ['SET', node, val]
    }
    tracer.traced = false
    return tracer
}

function Scope(level, locals, labels) {
    this.level  = level
    this.locals = locals
    this.labels = labels
}

Scope.create = function() {
    return new Scope(0, 0, 0) 
}

Scope.prototype = {
    extend: function() {
	      return new Scope(this.level+1, 0, 0)
    },

    makeLocal: function() {
	      return ['LOCAL', this.level, this.locals++]
    },

    makeLabel: function(tracer) {
	      return ['LABEL', this.level, this.labels++, false, tracer]
    }

}

function Context(block, env, scope) {
    this.block = block
    this.env   = env
    this.scope = scope
}

Context.create = function() {
    return new Context([], Dict.create(), Scope.create())
}

Context.compile = function(prog, wantRtn) {
    var ctx = Context.create()

    if (wantRtn) {
	      var rtn = ctx.scope.makeLocal()
	      ctx.compile(prog, tracerFor(rtn))
	      ctx.declareLocals()
	      ctx.push(['RETURN', rtn])
    } 

    else {
	      ctx.compile(prog, null)
	      ctx.declareLocals()
    }

    return ctx.block

}

Context.prototype = {

    extendEnv: function() {
	      return new Context(
	          this.block, 
	          this.env.extend(), 
	          this.scope
	      )
    },

    extendScope: function() {
	      return new Context(
	          [],
	          this.env.extend(),
	          this.scope.extend()
	      )
    },

    declareLocals: function() {
	      if (this.scope.locals > 0) {
	          this.block.unshift(['DECLARE', this.scope.level, this.scope.locals]) 
	      }
    },

    withBlock: function() {
	      return new Context([], this.env, this.scope)
    },

    bindLabel: function(node, tracer) {
	      var label = this.scope.makeLabel(tracer)
	      this.env.put(node, label)
	      return label
    },

    bindLocal: function(node) {
	      var local = this.scope.makeLocal()
	      this.env.put(node, local)
	      return local
    },

    bindArgs: function(nodes) {
	      var args = []
	      for (var i=0; i<nodes.length; i++) {
	          var arg = ['ARG', this.scope.level, i]
	          this.env.put(nodes[i], arg)
	          args.push(arg)
	      }
	      return args
    },

    getLocal: function(node) {
	      return this.env.get(node)
    },

    getLabel: function(node) {
	      return this.env.get(node)
    },

    push: function(x) {
	      this.block.push(x)
    },

    pushExpr: function(x, t) {
	      this.block.push(t ? t(x) : x)
    },

    pushPure: function(x, t) {
	      if (t) { this.block.push(t(x)) }
    },

    toAtom: function(node) {	
	      var tag = node[0]
	      switch(tag) {

	      case 'CONST':
	          return node

	      case 'VAR':
	          return this.getVar(node)

	      default:
	          var atom = this.scope.makeLocal()
	          this.compile(node, tracerFor(atom))
	          return atom
	      }
    },

    toExprs: function(nodes) {
	      var exprs = []
	      for (var i=0; i<nodes.length; i++) {
	          exprs[i] = this.toExpr(nodes[i])
	      }
	      return exprs
    },

    toExpr: function(node) {
	      var tag = node[0]
	      switch(tag) {

	      case 'RESTARGS':
	      case 'RAW':
	      case 'CONST':
	      case 'KEYWORD':
	      case 'GLOBAL':	    
	          return node

	      case 'ARRAY':
	          return ['ARRAY', this.toExprs(node[1])]

	      case 'PROPERTY':
	          return ['PROPERTY', this.toExpr(node[1]), this.toExpr(node[2])]

	      case 'LOCAL':
	          return this.getLocal(node)

	      case 'SET':
	          var loc = this.toExpr(node[1])
	          this.compile(node[2], tracerFor(loc))
	          return loc

	      case 'FUN':
	          var cmp    = this.extendScope()
	          var ret    = cmp.scope.makeLocal()
	          var args   = cmp.bindArgs(node[1])
	          cmp.compile(node[2], tracerFor(ret))
	          cmp.declareLocals()
	          cmp.push(['RETURN', ret])
	          return ['FUN', args, cmp.block]

	      case 'CALL':
	          var callee = this.toExpr(node[1])
	          var args   = this.toExprs(node[2])
	          return ['CALL', callee, args]

	      case 'NEW':
	          var callee = this.toExpr(node[1])
	          var args   = this.toExprs(node[2])
	          return ['NEW', callee, args]

	      case 'THIS':
	      case 'RESTARGS':
	      case 'THROW':
	      case 'RETURN_FROM':
	          this.compile(node, null)
	          return ['CONST', null]

	      case 'BEGIN':
	          var body = node[1]
	          var len  = body.length
	          for (var i=0; i<len; i++) {
		            if (i < len-1) {
		                this.compile(body[i], null)
		            } else {
		                return this.toExpr(body[i])
		            }
	          }

	      default:
	          var local = this.scope.makeLocal()
	          this.compile(node, tracerFor(local))
	          return local
	          
	      }
    },

    toBlock: function(node, tracer) {
	      var cmp = this.withBlock()
	      cmp.compile(node, tracer)
	      return cmp.block
    },

    compileBody: function(body, tracer) {	
	      var len = body.length
	      for (var i=0; i<len; i++) {
	          if (i < len-1) {
		            this.compile(body[i], null)
	          } else {
		            this.compile(body[i], tracer)
	          }
	      }
    },

    compile: function(node, tracer) {
	      var tag = node[0]

	      switch(tag) {

	      case 'RAW':
	      case 'CONST':
	      case 'GLOBAL':
	          this.pushPure(node, tracer)
	          break

	      case 'KEYWORD':
	          this.pushPure(this.toExpr(node), tracer)
	          break

	      case 'LOCAL':
	          this.pushPure(this.getLocal(node), tracer)
	          break

	      case 'BEGIN':
	          this.compileBody(node[1], tracer)
	          break

	      case 'IF':
	          var test        = this.toAtom(node[1])
	          var consequent  = this.toBlock(node[2], tracer)
	          var alternative = this.toBlock(node[3], tracer)
	          this.push(['IF', test, consequent, alternative])
	          break

	      case 'LOOP':
	          var cmp   = this.extendEnv()
	          var label = cmp.bindLabel(NULL_LABEL, tracer)
	          var block = cmp.toBlock(node[1], tracer)
	          this.push(['LOOP', label, block])	   
	          break

	      case 'BLOCK':
	          var cmp   = this.extendEnv()
	          var label = cmp.bindLabel(node[1], tracer)
	          var block = cmp.toBlock(node[2], tracer)
	          this.push(['BLOCK', label, block])
	          break
	          
	      case 'RETURN_FROM':
	          // label structure:
	          // [ TAG, LEVEL, ID, HAS_NON_LOCAL_EXITS?, TRACER, CONTEXT]
	          var label  = this.getLabel(node[1])
	          var tracer = label[4]
	          this.compile(node[2], tracer)
	          if (this.scope.level != label[1]) {	
		            if (!label[3]) { label[3] = true }
		            this.push(['NON_LOCAL_EXIT', label])
	          } else {
		            this.push(['LOCAL_EXIT', label])
	          }
	          break

	      case 'LETREC':
	          var ctx      = this.extendEnv()
	          var bindings = node[1]
	          var body     = node[2]
	          var locals = []

	          for (var i=0; i<bindings.length; i++) {		
		            var pair  = bindings[i]
		            var sym   = pair[0]
		            var local = ctx.scope.makeLocal()
		            locals.push(local)
		            ctx.env.put(sym, local)
	          }

	          for (var i=0; i<bindings.length; i++) {		
		            var pair  = bindings[i]
		            var expr  = pair[1]
		            var local = locals[i]
		            ctx.compile(expr, tracerFor(local))
	          }

	          ctx.compile(body, tracer)

	          break

	      case 'LET':
	          var ctx      = this
	          var bindings = node[1]
	          var body     = node[2]
	          for (var i=0; i<bindings.length; i++) {		
		            var pair  = bindings[i]
		            var sym   = pair[0]
		            var expr  = pair[1]
		            var local = ctx.scope.makeLocal()
		            ctx.compile(expr, tracerFor(local))
		            ctx = ctx.extendEnv()
		            ctx.env.put(sym, local)
	          }
	          ctx.compile(body, tracer)
	          break

	      case 'THROW':
	          this.push(['THROW', this.toExpr(node[1])])
	          break

	      case 'PROPERTY':
	      case 'SET':
	      case 'FUN':
	      case 'ARRAY':
	          this.pushPure(this.toExpr(node), tracer)
	          break

	      case 'NEW':
	      case 'CALL':
	          this.pushExpr(this.toExpr(node), tracer)
	          break

	      case 'RESTARGS':
	          var local = this.bindLocal(node[1])
	          this.push(['RESTARGS', local, node[2]])
	          break

	      case 'THIS':
	          var local = this.bindLocal(node[1])
	          this.push(['THIS', local])
	          break	    

	      case 'UNWIND_PROTECT':
	          var map      = node[1]
	          var res      = {}
	          var _try     = map['try']
	          var _catch   = map['catch']
	          var _finally = map['finally']
	          
	          if (_try) {
		            map['try'] = this.toBlock(_try, tracer)
	          }
	          
	          if (_catch) {
		            var ctx  = this.extendEnv()
		            var sym  = _catch[0]
		            var expr = _catch[1]
		            var loc  = ctx.scope.makeLocal()
		            ctx.env.put(sym, loc)						
		            map['catch'] = ctx.toBlock(expr, tracer)		
		            map['catch'].unshift(['SET', loc, ['RAW', 'e']])
	          }

	          if (_finally) {
		            map['finally'] = this.toBlock(_finally, tracer)		
	          }
	          
	          this.push(['UNWIND_PROTECT', map])
	          break
	          
	      default:
	          throw Error('bad tag in compile: ' + node[0])
	      }
    },

    compileTopLevelFragment: function(normalizedSexp) {
	      this.compile(normalizedSexp)
	      this.declareLocals()
	      return this.block
    },

    compileExpression: function(normalizedSexp) {
	      var ret = this.scope.makeLocal()
	      this.compile(normalizedSexp, tracerFor(ret))
	      this.declareLocals()
	      this.push(['RETURN', ret])	
	      return this.block
    }

}

// END poet.compiler.js

// BEGIN poet.emitter.js

function emit(program, options) {
    var js = Emitter.emitProgram(program, options)
    publish('poet:emit', js)
    return js
}

function Emitter() {
    this.buffer    = []
    this.indention = 0
}

Emitter.emitProgram = function(program, options) {
    var e = new Emitter()
    if (options) { for (var v in options) { e[v] = options[v] } }
    e.emitStatements(program)
    return e.getResult().substring(1)
}

Emitter.bake = function(program, options) {
    var e = new Emitter()
    if (options) { for (var v in options) { e[v] = options[v] } }
    e.emitStatements(program)
    var warhead = Function(e.globalSymbol, e.getResult().substring(1))
    return warhead
}

Emitter.prototype = {
    indentSize:   4,

    globalSymbol: "RT",

    namespaceSeparator: "::",

    emitProgram: function(program) {
	      this.emitStatements(program)
	      return this.getResult()
    },

    getResult: function() {
	      return this.buffer.join("")
    },

    indent: function() {
	      this.indention += this.indentSize
    },

    dedent: function() {
	      this.indention -= this.indentSize
    },

    write: function(x) {
	      this.buffer.push(x)
    },

    tab: function() {
	      var i=this.indention
	      while(i--) { this.write(" ") }
    },

    // carriage return
    cr: function() {
	      this.write("\n")
	      this.tab()
    },

    emitNodes: function(nodes, sep) {
	      var started = false
	      for (var i=0; i<nodes.length; i++) {
	          if (started) { this.write(sep) } else { started = true }
	          this.emit(nodes[i])
	      }
    },

    emitArray: function(nodes) {
	      this.write("[")
	      this.emitNodes(nodes, ", ")
	      this.write("]")
    },

    emitList: function(nodes) {
	      this.write("(")
	      this.emitNodes(nodes, ", ")
	      this.write(")")
    },

    emitStatements: function(nodes) {
	      for (var i=0; i<nodes.length; i++) {
	          this.cr()
	          this.emit(nodes[i]);
	          this.write(";")
	      }
    },

    emitBlock: function(nodes) {
	      this.write("{")
	      this.indent()
	      this.emitStatements(nodes)
	      this.dedent()
	      this.cr()
	      this.write("}")
    },

    emitLabel: function(node) {
	      this.write("block_")
	      this.write(node[1])
	      this.write("_")
	      this.write(node[2])
    },

    emitFlag: function(node) {
	      this.write("flag_")
	      this.write(node[1])
	      this.write("_")
	      this.write(node[2])
    },

    emitLabeledBlock: function(prefix, label, block) {
	      var hasNonLocalExits = label[3]	

	      if (hasNonLocalExits) {	    
	          this.write('var ')
	          this.emitFlag(label)
	          this.write(' = true;')
	          this.cr()
	          this.write('try {')
	          this.indent()
	          this.cr()
	      }

	      this.emitLabel(label)
	      this.write(":")
	      this.write(prefix)
	      this.write(" ")
	      this.emitBlock(block)
	      
	      if (hasNonLocalExits) {
	          this.dedent()
	          this.cr()

	          this.write("} catch (e) {")
	          this.indent()
	          this.cr()

	          this.write('if (')
	          this.emitFlag(label)
	          this.write(') {')
	          this.indent()
	          this.cr()

	          // flag not thrown
	          this.write('throw e;')
	          this.dedent()
	          this.cr()
	          this.write('}')
	          this.dedent()
	          this.cr()
	          this.write('} finally {')
	          this.indent()
	          this.cr()
	          
	          this.emitFlag(label)
	          this.write(' = false')
	          this.dedent()
	          this.cr()
	          this.write('}')	    
	      }

    },

    emit: function(node) {
	      var tag = node[0]
	      var a   = node[1]
	      var b   = node[2]
	      var c   = node[3]

	      switch(tag) {

	      case 'KEYWORD':
	          this.write('RT["poet::keyword"](' + JSON.stringify(a) + ')')
	          break

	      case 'IF':	    
	          this.write('if (')
	          this.emit(a)
	          this.write(' != null && ')
	          this.emit(a)
	          this.write(' !== false) ')
	          this.emitBlock(b)

	          if (c[0]) {
		            this.write(' else ')
		            if (c[0][0] == 'IF') {
		                this.emit(c[0])
		            } 
		            else {
		                this.emitBlock(c)
		            }
	          }
	          break

	      case 'ARRAY':
	          this.emitArray(a)
	          break

	      case 'DECLARE':
	          this.write('var ')
	          var flag = false
	          for (var i=0; i<b; i++) {
		            if (flag) { this.write(', ') } else { flag = true }
		            this.write('local_' + a + '_' + i)
	          }
	          break

	      case 'PROPERTY':
	          this.emit(a)
	          this.write('[')

	          if (b[0] == 'KEYWORD') {
		            this.write(JSON.stringify(b[1]))
	          } else {
		            this.emit(b)
	          }

	          this.write(']')
	          break

	      case 'RAW':
	          this.write(a)
	          break

	      case 'CONST':
	          if (typeof a == 'string') {
		            this.write(JSON.stringify(a))
	          }

	          else {
		            this.write('' + a)
	          }

	          break;

	      case 'GLOBAL': 
	          this.write(this.globalSymbol)
	          this.write("[\"")
	          this.write(a)
	          this.write(this.namespaceSeparator)
	          this.write(b)
	          this.write("\"]")
	          break

	      case 'ARG':
	          this.write("arg_" + a + "_" + b)
	          break

	      case 'LOCAL':
	          this.write("local_" + a + "_" + b)
	          break

	      case 'SET':
	          this.emit(a)
	          this.write(" = ")
	          this.emit(b)
	          break

	      case 'FUN':
	          this.write("function")
	          this.emitList(a)
	          this.write(" ")
	          this.emitBlock(b)
	          break

	      case 'CALL':
	          this.emit(a)
	          this.emitList(b)
	          break

	      case 'NEW':
            this.write('new ')
	          this.emit(a)
	          this.emitList(b)
	          break

	      case 'THROW':
	          this.write('throw ')
	          this.emit(a)
	          break

	      case 'RETURN':
	          this.write('return ')
	          this.emit(a)
	          break	    

	      case 'LOOP':
	          this.emitLabeledBlock('for(;;)', a, b)
	          break

	      case 'BLOCK':
	          this.emitLabeledBlock('', a, b)
	          break

	      case 'LOCAL_EXIT':
	          this.write('break ')
	          this.emitLabel(a)
	          break

	      case 'NON_LOCAL_EXIT':
	          this.emitFlag(a)
	          this.write(' = false; ')
	          this.write('throw "NON_LOCAL_EXIT"')
	          break

	      case 'RESTARGS':
	          this.write('var len = arguments.length;')
	          this.cr()
	          
	          this.emit(a); this.write(' = new Array(len-'+b+');')	    
	          this.cr()

	          this.write('for(var i=0, ii=len-'+b+'; i<ii; i++) {')

	          this.indent()
	          this.cr()

	          this.emit(a)
	          this.write('[i] = arguments[i+'+b+'];')
	          
	          this.dedent()
	          this.cr()

	          this.write("}")
	          break

	      case 'THIS':
	          this.emit(a)
	          this.write(' = this')
	          break

	      case 'UNWIND_PROTECT':
	          this.write('try ')
	          this.emitBlock(a['try'] || [])

	          if (a['catch']) {
		            this.write(' catch(e) ')
		            this.emitBlock(a['catch'])
	          }

	          if (a['finally']) {
		            this.write(' finally ')
		            this.emitBlock(a['finally'])
	          }

	          break

	      default:
	          throw Error('unhandled tag in emitter: ' + tag)

	      }

    }

}


// END poet.emitter.js

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

// BEGIN poet.main.js

// initialization

var poet = Env.create('poet')

RT['poet::*env*'] = poet

RT['poet::macroexpand-1'] = function(sexp) {
    return macroexpand1(RT['poet::*env*'], sexp)
}

RT['poet::macroexpand'] = function(sexp) {
    return macroexpand(RT['poet::*env*'], sexp)
}

var specialForms = [
    'define*', 'define-macro*', 
    'quote', 'quasiquote', 'unquote', 'unquote-splicing',
    'fn*', 'let*', 'letrec*', 'begin', 'if', 'set!',
    'block', 'loop', 'return-from', 'unwind-protect', 'throw', 'js*',
    'require', 'new', "."
]

specialForms.forEach(function(name) {
    var sym = new Symbol.Simple(name)
    poet.putSymbol(sym, name)
    poet.addExport(sym)
})

for (var v in RT) {
    var segs      = v.split("::")
    var namespace = segs[0]
    var name      = segs[1]
    var sym       = new Symbol.Simple(name)
    var qsym      = new Symbol.Qualified(namespace, name)
    var env       = Env.findOrCreate(namespace)
    env.putSymbol(sym, qsym)
    env.addExport(sym)
}

function loadTopLevel(config) {
    var src    = config.src
    var env    = config.env
    var origin = config.origin

    var previousEnv = RT['poet::*env*']

    try {
	      RT['poet::*env*'] = env
	      expandTopLevel({
	          reader : Reader.create({input: src, origin: origin})
	      })	
    }

    finally {
	      RT['poet::*env*'] = previousEnv
    }

}

function expandTopLevel(config) {
    var rdr       = config.reader 
    var env       = config.env    || RT['poet::*env*']
    var buf       = config.buffer || []

    reading:while (!rdr.isEmpty()) {

	      var sexp = rdr.read()
	      buf.push(sexp)	
	      
	      expanding:while(buf.length > 0) {
	          var sexp = macroexpand(env, buf.shift())

	          publish('poet:macroexpand-toplevel-sexp', {sexp: sexp})

	          if (maybeResolveToBegin(env, sexp)) {
		            buf = sexp.rest().toArray().concat(buf)
		            continue expanding
	          }

	          else if (maybeResolveToDefineMacro(env, sexp)) {

		            var sym = sexp.rest().first()
		            var def = sexp.rest().rest().first()			

		            var esexp    = expand(env, def)

		            var nsexp    = normalize(esexp)
		            var jsast    = compile(nsexp, true)		
		            var js       = emit(jsast)

		            var warhead  = Function('RT', js)		
		            var submacro = warhead(RT)

		            var macro = (function(submacro) {		   
		                return function(sexp, callingEnv) {
			                  return submacro(sexp, callingEnv, env)
		                }		    
		            })(submacro)

		            var qsym = bindMacro(env, sym, macro)				

		            publish('poet:emit-toplevel-macro', {
		                symbol: qsym,
		                js:     js
		            })

		            continue expanding

	          }

	          else {

		            if (maybeResolveToDefine(env, sexp)) {
		                var sym  = sexp.rest().first()
		                var loc  = bindGlobal(env, sym)		
		                var expr = sexp.rest().rest().first()
		                sexp = List.create(Symbol.builtin('set!'), loc, expr)
		            }	    
		            
		            var esexp   = expand(env, sexp)		
		            var nsexp   = normalize(esexp)
		            var jsast   = compile(nsexp, false)
		            var js      = emit(jsast)

		            publish('poet:emit-toplevel-expression', {
		                sexp: sexp,
		                js:   js
		            })

		            var warhead = Function('RT', js)	
		            warhead(RT)
		            continue expanding

	          }	    

	      }

    }

}

function p(x) {
    var inspect = require('util').inspect
    println(inspect(x, false, null))
}

/*

  function compileFile(filename, main) {
  var src = require('fs').readFileSync(filename, 'utf8')
  var rdr = Reader.create({input: src, origin: filename})
  return compileReader(rdr, main)
  }

  function compileReader(reader, main) {    
  var ebuf = [poet_preamble]
  var mbuf = []

  function handleExpression(data) {
	ebuf.push(data.js)
  }

  function handleMacro(data) {
	mbuf.push(data)
	println('[HANDLE_DEFMACRO]')
	p(data)
	newline()
  }

  function handleSexp(data) {
	println('[MACROEXPAND]')
	prn(data.sexp)
	newline()
  }

  function handleCompile(ast) {
	println('[COMPILE]')
	p(ast)
	newline()
  }

  function handleNormalize(ast) {
	println(['NORMALIZE'])
	p(ast)
	newline()
  }

  function handleExpansion(esexp) {
	println(['EXPAND'])
	prn(esexp)
	newline()
  }

  // subscribe('poet:macroexpand-toplevel-sexp', handleSexp)
  subscribe('poet:emit-toplevel-expression', handleExpression)
  // subscribe('poet:emit-toplevel-macro', handleMacro)
  // subscribe('poet:compile', handleCompile)
  // subscribe('poet:normalize', handleNormalize)
  // subscribe('poet:expand', handleExpansion)
  // skip env creation for now

  expandTopLevel({
	reader : reader,
	env    : RT['poet::*env*']
  }) 

  // unsubscribe('poet:macroexpand-toplevel-sexp', handleSexp)
  unsubscribe('poet:emit-toplevel-expression', handleExpression)
  // unsubscribe('poet:emit-toplevel-macro', handleMacro)

  if (main) {
	ebuf.push('\nRT[' + JSON.stringify(main) + ']()')
  }

  return ebuf.join("")

  }

*/

var poet_preamble = ""

var ECHO = false

function compileModule(module, main) {
    var buf = [poet_preamble]    
    function append(data) { 
	      var js = data.js
	      // when emitting a compiled file 
	      // we have to wrap any top level expressions
	      // that create local variables

        if (RT['poet::*echo-js*']) { 
            console.log(js) 
        }

	      if (/^\s*var.*/.test(js)) { js = "!(function() {\n" + js + "\n})();" }		    
	      buf.push(js) 
    }
    subscribe('poet:emit-toplevel-expression', append)

    subscribe(
        'poet:macroexpand-toplevel-sexp', 
        function(x) { if(RT['poet::*echo-sexp*']) { prn(x.sexp) } }
    ) 

    Env.load(module)
    unsubscribe('poet:emit-toplevel-expression', append)
    if (main) {	ebuf.push('\nRT[' + JSON.stringify(main) + ']()') }
    buf = buf.filter(function(x) { 
	      return !(x === "" || (/^\s+$/).test(x))
    })
    return buf.join("\n\n")
}

// first things first
// we load poet

function loadPreamble() {
    var buf = [poet_preamble]    
    function append(data) { buf.push(data.js) }
    subscribe('poet:emit-toplevel-expression', append)
    Env.reload('poet')
    unsubscribe('poet:emit-toplevel-expression', append)
    if (main) {	ebuf.push('\nRT[' + JSON.stringify(main) + ']()') }
    return buf.join("")
}

//var poet_src = RT['poet::slurp']('poet.poet')
//var poet_preamble = compileReader(
//    Reader.create({input: poet_src, origin: 'poet.poet'})   
//)

if (process.argv.length > 2) {
    // console.log(RT['poet::*load-path*'])
    loadPreamble()

    var fs      = require('fs')
    var target  = process.argv[2]
    var prefix  = target.replace(/\.poet$/, '')
    var main    = process.argv[3]
    var program = compileModule(target, main)    
    var outfile = prefix + '.js'
    fs.writeFileSync(outfile, program)
}

// END poet.main.js
