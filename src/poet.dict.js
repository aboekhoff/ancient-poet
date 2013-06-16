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



