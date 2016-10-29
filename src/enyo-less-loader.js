var path = require('path');
var fs = require('graceful-fs');
var loaderUtils = require("loader-utils");

module.exports = function(content, sourceMap) {
	if(this.cacheable) this.cacheable();
	var query = loaderUtils.parseQuery(this.query);
	var header = '';

	if(path.extname(this.resourcePath)==='.less' && query.refs && query.refs.length>01) {
		for(var i=0; i<query.refs.length; i++) {
			if(this.resourcePath!==query.refs[i] && path.extname(query.refs[i])==='.less') {
				var relStyle = path.relative(path.dirname(this.resourcePath), query.refs[i]);
				header += '@import (reference) "' + relStyle.replace(/\\/g, '/') + '";\n';
			}
		}
		header += '\n\n';
	}

	return header + content;
};