// we can implement this later

function LogicalBlock(options) {
    this.parent                 = options.parent         
    this.section                = options.section        
    this.start_col              = options.startCol       
    this.indent                 = options.indent         
    this.done_nl                = options.done_nl        
    this.intra_block_nl         = options.intra_block_nl 
    this.prefix                 = options.prefix         
    this.per_line_prefix        = options.per_line_prefix
    this.suffix                 = options.per_line_suffix    
    this.logical_block_callback = options.logical_block_callback
}

function Section(parent) {
    this.parent = parent
}

function isAncestor(parent, child) {
    for(;;) {	
	if (child == null)    { return false }
	if (parent === child) { return true }
	else                  { parent = child }
    }
}

