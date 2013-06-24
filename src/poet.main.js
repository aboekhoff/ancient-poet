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
    'fn*', 'let*', 'letrec*', 'begin', 'if', 'set',
    'block', 'loop', 'return-from', 'unwind-protect', 'throw', 'js*',
    'require', 'new'
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
		                sexp = List.create(Symbol.builtin('set'), loc, expr)
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

function compileModule(module, main) {
    var buf = [poet_preamble]    
    function append(data) { 
	      var js = data.js
	      // when emitting a compiled file 
	      // we have to wrap any top level expressions
	      // that create local variables
        console.log(js)
	      if (/^\s*var.*/.test(js)) { js = "!(function() {\n" + js + "\n})();" }		    
	      buf.push(js) 
    }
    subscribe('poet:emit-toplevel-expression', append)
    subscribe('poet:macroexpand-toplevel-sexp', function(x) { prn(x.sexp) })
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
