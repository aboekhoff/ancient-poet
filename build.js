var fs   = require('fs')
var path = require('path')

ROOT_DIR   = __dirname
SRC_DIR    = path.join(ROOT_DIR, 'src')
OUTPUT_DIR = ROOT_DIR
COMPILER_TARGETS = [
    'poet.list.js', 
    'poet.symbol.js', 
    'poet.keyword.js',
    'poet.dict.js',
    'poet.env.js',
    'poet.reader.js',
    'poet.expander.js',
    'poet.normalizer.js',
    'poet.compiler.js',
    'poet.emitter.js',
    'poet.generic.js',
    'poet.iterable.js',
    'poet.pubsub.js',
    'poet.runtime.js',
    'poet.main.js'
]

BROWSER_RUNTIME_TARGETS = [
    'poet.list.js',
    'poet.symbol.js',
    'poet.keyword.js',
    'poet.generic.js',
    'poet.iterable.js',
    'poet.pubsub.js',
    'poet.runtime.js'
]

// node poet

var buf = []

for (var i=0; i<COMPILER_TARGETS.length; i++) {
    var target = COMPILER_TARGETS[i]
    buf.push("// BEGIN " + target + "\n")
    buf.push(fs.readFileSync(path.join(SRC_DIR, target), 'utf8'))
    buf.push("// END " + target + "\n")
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'poet.js'), buf.join("\n"))

// browser runtime

var buf = []

for (var i=0; i<BROWSER_RUNTIME_TARGETS.length; i++) {
    var target = BROWSER_RUNTIME_TARGETS[i]
    buf.push("// BEGIN " + target + "\n")
    buf.push(fs.readFileSync(path.join(SRC_DIR, target), 'utf8'))
    buf.push("// END " + target + "\n")
}

buf.unshift('!(function() {\n')
buf.push('window.RT = RT')
buf.push('\n})()')

fs.writeFileSync(path.join(OUTPUT_DIR, 'poet.browser.js'), buf.join("\n"))

