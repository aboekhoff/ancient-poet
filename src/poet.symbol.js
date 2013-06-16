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
