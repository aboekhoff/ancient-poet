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

