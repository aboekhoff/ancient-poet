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

var toIterator = Generic({name: '->iterator'})

Generic.addMethods(
    toIterator,
    null,  function(_) { return new NullIterator() },
    Array, function(array) { return new ArrayIterator(array) },
    List,  function(list) { return new ListIterator(list) }    
)

function forEach(func, coll) {
    var iter = toIterator(coll)
    while (iter.hasNext()) {
        func(iter.next())
    }
}

function forEach_(func) {
    var iters = []
    var args  = []

    for (var i=1; i<arguments.length; i++) {
        iters.push(toIterator(arguments[i]))
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


