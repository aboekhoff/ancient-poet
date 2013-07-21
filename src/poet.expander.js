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
	      (/\.[^\.]+/.test(x.toString())) 	
}

function expandCall(e, x) {
    if (isFrontDotted(x.first())) {
	      return expandFrontDottedList(e, x)
    } else {
	      return expandSexps(e, x)
    }
}

function expandFrontDottedList(e, x) {
    var method   = x.first().reify().name.substring(1)
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

