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

