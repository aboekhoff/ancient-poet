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
