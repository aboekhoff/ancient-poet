require('./build.js')

var fs      = require('fs')
var poet    = require('./poet.js')
var scratch = poet.compileFile('./scratch.poet', 'poet::-main')

fs.writeFileSync('scratch.js', scratch)
