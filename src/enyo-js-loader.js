var path = require('path');
var loaderUtils = require("loader-utils");
var	atNotation = /(['"])\@([.@][^\n\r\t\1]+?)\1/g;
var findRequest = /\brequest\(['"]([^'"]+).\)/g;
var isRequestFn = /\brequest\.isRequest\([^\)]+\)/g;


module.exports = function(content, sourceMap) {
	if(this.cacheable) this.cacheable();
	var query = loaderUtils.parseQuery(this.query);
	var context = this.options.context;
	var resourcePath = this.resourcePath;

	// Prepend the promise polyfill in the first js file of the build
	var header = '';
	if(query.isEntry) {
		var promise = path.join(__dirname, 'promise.js').replace(/\\/g, '/');
		header += 'require(\'' + promise + '\');\n\n';
	}

	// Rewrite @-notion shorthand paths
	content = content.replace(atNotation, function(match, delim, uri) {
		// @. is relative path and @@ means library name
		if(uri.charAt(0) === '@') {
			uri = resolved.replace('@', './node_modules/');
		} else {
			var file = path.join(path.dirname(resourcePath), uri);
			uri = path.relative(context, file);
			if(uri.charAt(0) !== '.') {
				uri = './' + uri;
			}
		}
		return '\'' + uri.replace(/\\/g, '/') + '\'';
	});

	// Rewrite request
	var hasRequest = false;
	content = content.replace(findRequest, function(match, value) {
		hasRequest = true;
		return 'request(function(cb){ require.ensure([' + value + '], function(require){ cb(require(' + value + ')); }) })';
	});
	if(hasRequest || isRequestFn.test(content)) {
		var request = path.join(__dirname, 'request.js').replace(/\\/g, '/');
		header += 'require(\'' + request.replace(/\\/g, '/') + '\');\n\n';
	}

	// Append associated css/less requirements
	var footer = '';
	if(query.styles && query.styles.length>0) {
		footer += '\n\n';
		for(var i=0; i<query.styles.length; i++) {
			footer += '\nrequire(\'./' + query.styles[i].replace(/\\/g, '/') + '\');';
		}
	}
	return header + content + footer;
};
