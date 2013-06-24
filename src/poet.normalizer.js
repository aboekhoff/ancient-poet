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
	          
	      case 'set' :
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
