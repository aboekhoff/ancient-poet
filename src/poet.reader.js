// FIXME (add back support for qualified symbols and keywords)

function Position(offset, line, column, origin) {
    this.offset = offset;
    this.line   = line;
    this.column = column;
    this.origin = origin;
}

Position.prototype.toString = function() {
    return "line " + this.line   + ", " +
	      "column " + this.column + ", " +
	      "of "     + (this.origin || "unknown location");
};

function Reader() {	
    this.input  = null;
    this.offset = 0;
    this.line   = 1;
    this.column = 1;
    this.origin = "unknown";
}

Reader.create = function(options) {
    var reader   = new Reader();
    options = options || {}
    reader.input  = options.input  || null
    reader.origin = options.origin || null
    return reader;
}

Reader.hexRegex    = /^0(x|X)[0-9a-fA-F]+/;
Reader.octRegex    = /^0[0-7]+/;
Reader.intRegex    = /^(0)|[1-9][0-9]*/;
Reader.floatRegex  = /^((0)|[1-9][0-9]*)\.[0-9]+/;
Reader.binaryRegex = /^0(b|B)[01]+/;

Reader.escapeMap = {
    'n'  : '\n',
    'r'  : '\r',
    'f'  : '\f',
    'b'  : '\b',
    't'  : '\t',
    '"'  : '"',
    '\\' : '\\'
};

Reader.notTerminal = function(c) {
    switch (c) {
    case ' ':
    case '\t':
    case '\n':
    case '\r':
    case '\f':
    case ';':
    case '(':
    case ')':
    case '[':
    case ']':
    case '{':
    case '}':
    case '"':
    case "'":
    case '`':
	      return false;
    default:
	      return true;
    }
};

Reader.prototype = {
    constructor: Reader,

    makeList: function(list, position) {
	      list = List.fromArray(list)
	      if (position) { list['source-position'] = position }
	      return list
    },

    makeArray: function(array, position) {
	      if (position) { array['source-position'] = position }
	      return array
    },

    reset: function(input, origin) {
	      this.input  = input;
	      this.origin = origin;
	      this.offset = 0;
	      this.line   = 1;
	      this.column = 1;
    },

    loadPosition: function(position) {
	      this.offset = position.offset;
	      this.line   = position.line;
	      this.column = position.column;
	      this.origin = position.origin;		
    },

    getPosition: function() {
	      return new Position(
	          this.offset,
	          this.line,
	          this.column,
	          this.origin
	      );
    },

    isEmpty: function() {
	      this.readWhitespace();
	      return this.offset >= this.input.length;
    },

    peek: function() {
	      return this.input[this.offset];
    },

    pop: function() {
	      var c = this.peek();
	      this.offset++;

	      switch(c) {
	      case '\n':
	      case '\r':
	      case '\f':	    
	          this.line++
	          this.column = 1
	          break
	      default:
	          this.column++
	      }

	      return c;
    },

    popWhile: function(pred) {
	      var s = [];
	      for(;;) {
	          var c = this.peek();
	          if (c == null || !pred(c)) { break; }
	          s.push(this.pop());
	      }
	      return s.join("");
    },

    readWhitespace: function() {
	      var inComment = false;
	      loop:for(;;) {
	          var c = this.peek();
	          if (c == null) { return; }

	          switch(c) {
	          case ';' : 
		            inComment = true; 
		            this.pop(); 
		            continue loop;

	          case '\n': 
	          case '\r':
	          case '\f': 
		            inComment = false;

	          case ' ' :
	          case '\t':
		            this.pop();
		            continue loop;

	          default:
		            if (inComment) { 
		                this.pop(); 
		            } else {
		                return;
		            }
		            
	          }
	      }
    },

    read: function() {
	      this.readWhitespace();
	      var pos  = this.getPosition()
	      var sexp = this.readSexp()
	      publish('poet:read', { sexp: sexp, position: pos})
	      return sexp
    },

    readSexp: function() {
	      this.readWhitespace();

	      var nextChar = this.peek();

	      switch (nextChar) {
	      case ')': this.syntaxError('unmatched closing paren');
	      case ']': this.syntaxError('unmatched closing brace');
	      case '(': return this.readList();
	      case '[': return this.readArray();
        case '{': return this.readObject();
	      case '"': return this.readString();
	      case "'": return this.readQuote();
	      case ',': return this.readUnquote();
	      case '`': return this.readQuasiquote();
	      default:  return this.readAtom();
	      }
    },

    readQuote: function() {
	      var position = this.getPosition();
	      this.pop();
	      return this.makeList(
	          [Symbol.builtin('quote', position),
	           this.readSexp()], 
	          position);
    },

    readQuasiquote: function() {
	      var position = this.getPosition();
	      this.pop();
	      return this.makeList(
	          [Symbol.builtin('quasiquote'),
	           this.readSexp()],
	          position);		
    },

    readUnquote: function() {
	      var position = this.getPosition();
	      var name     = 'unquote';
	      this.pop();

	      if (this.peek() == '@') {
	          this.pop();
	          name = 'unquote-splicing';
	      }				

	      return this.makeList(
	          [Symbol.builtin(name), this.readSexp()]
	      )

    },

    readObject: function() {
	      var position = this.getPosition();		
	      var list     = [];
	      this.pop();

	      loop:for(;;) {			
	          this.readWhitespace();
	          var c = this.peek();
	          switch(c) {

	          case null: 
		            this.error('unclosed object-literal', position);
		            
	          case '}': 
		            this.pop(); 
		            break loop;

	          default: 
		            list.push(this.readSexp()); continue loop;
	          }
	      }

        return List.fromArray(list).cons(Symbol.builtin('object'))

    },

    readArray: function() {
	      var position = this.getPosition();		
	      var list     = [];
	      this.pop();

	      loop:for(;;) {			
	          this.readWhitespace();
	          var c = this.peek();
	          switch(c) {

	          case null: 
		            this.error('unclosed array-literal', position);
		            
	          case ']': 
		            this.pop(); 
		            return this.makeArray(list, position);

	          default: 
		            list.push(this.readSexp()); continue loop;
	          }
	      }
    },

    readList: function() {
	      var position = this.getPosition();		
	      var list     = [];
	      this.pop();

	      loop:for(;;) {			
	          this.readWhitespace();
	          var c = this.peek();
	          switch(c) {
	          case null: 
		            this.error('unclosed list', position);

	          case ')': 
		            this.pop(); return this.makeList(list, position);

	          default: 
		            list.push(this.readSexp()); continue loop;
	          }
	      }
    },

    readString: function() {
	      var position = this.getPosition();
	      var string   = [];
	      this.pop();
	      loop:for(;;) {
	          var c = this.pop();
	          switch(c) {
	          case null: this.error('unclosed string literal', position);
	          case '"' : return string.join("");
	          case '\\':
		            var position2 = this.getPosition();
		            var cc = Reader.escapeMap[this.pop()];
		            if (!cc) { this.error('invalid escape character', position2); }
		            string.push(cc);
		            continue;
	          default:
		            string.push(c);
		            continue;
	          }
	      }
    },

    parseNumber: function(string, position) {
	      var sign = 1;
	      if (string[0] == '-') {
	          sign   = -1;
	          string = string.substring(1);
	      }

	      switch (true) {
	      case Reader.octRegex.test(string) : 
            return sign * parseInt(string.substring(1), 8);

	      case Reader.floatRegex.test(string) : 
            return sign * parseFloat(string);

	      case Reader.intRegex.test(string) : 
            return sign * parseInt(string, 10);

	      case Reader.hexRegex.test(string) : 
            return sign * parseInt(string.substring(2), 16);

	      case Reader.binaryRegex.test(string) : 
            return sign * parseInt(string.substring(2), 2);

	      default:
	          throw Error('invalid number literal at ' + position);
	      }
    },

    // add in foo.bar.baz reader macro   

    parseSymbol: function(string, position) {
	      if (string[0] == ":") {
	          return Keyword.create(string.substring(1))
	      }

	      if (/[^\.]+(\.[^\.]+)+/.test(string)) {
	          var segs = string.split('.')
	          var root = this.parseSymbol(segs[0], position)
	          for (var i=1; i<segs.length; i++) {
		            root = List.create(
		                Symbol.builtin('.'),
		                root,
		                segs[i]
		            )
	          }
	          root['source-position'] = position
	          return root
	      }

	      else if (/##[^#]+#[^#]+/.test(string)) {
	          var segments = string.substring(2).split(/#/)
	          return new Symbol.Qualified(segments[0], segments[1])
	      }

	      else {
	          return new Symbol.Simple(string)
	      }
	      
    },

    readAtom: function() {
	      var position = this.getPosition();
	      var string   = this.popWhile(Reader.notTerminal);

	      switch (string) {
	      case '#t'    : return true;
	      case '#f'    : return false;
	      case '#nil'  : return null;
	          // case '#void' : return undefined;	    
	      }	

	      if (/^(\d|(-\d))/.test(string)) {
	          return this.parseNumber(string, position);
	      } else {
	          return this.parseSymbol(string, position);
	      }

    }    

};

