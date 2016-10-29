var path = require('path');
var fs = require('graceful-fs');
var P = (typeof Promise === 'undefined') ? require('promise') : Promise;
var cache = {};

var getEnyoPlugin = function(less) {
	var EnyoCachedFileManager = function(options) {
		this.options = options || {};
		this.options.libs = this.options.libs || [];
		this.isLibrary = new RegExp('node_modules[\\\\\\/](' + this.options.libs.join('|') + ')');
	};

	EnyoCachedFileManager.prototype = new less.UrlFileManager();

	EnyoCachedFileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
		return this.isLibrary.test(currentDirectory);
	};
	EnyoCachedFileManager.prototype.supportsSync = EnyoCachedFileManager.prototype.supports;

	EnyoCachedFileManager.prototype.loadFile = function(filename, currentDirectory, options, environment) {
		var f = path.join(currentDirectory, filename);
		var self = this;
		return new P(function(fulfill, reject) {
			if(cache[f]) {
				fulfill(cache[f]);
			} else {
				less.FileManager.prototype.loadFile.call(self, filename, currentDirectory, options, environment).then(function(result) {
					var parentLib = self.isLibrary.exec(currentDirectory)[0];
					var libPath = currentDirectory.substring(0, currentDirectory.indexOf(parentLib) + parentLib.length);
					if(self.options.refs[libPath] && self.options.refs[libPath].indexOf(f)>=0) {
						cache[f] = result;
					}
					fulfill(result);
				}).catch(reject);
			}
		});
	};
	EnyoCachedFileManager.prototype.loadFileSync = function(filename, currentDirectory, options, environment, encoding) {
		var f = path.join(currentDirectory, filename);
		var result;
		if(cache[f]) {
			result = cache[f];
		} else {
			result = less.FileManager.prototype.loadFileSync.call(this, filename, currentDirectory, options, environment)
			var parentLib = self.isLibrary.exec(currentDirectory)[0];
			var libPath = currentDirectory.substring(0, currentDirectory.indexOf(parentLib) + parentLib.length);
			if(!result['error'] && this.options.refs[libPath] && this.options.refs[libPath].indexOf(f)>=0) {
				cache[f] = result;
			}
		}
		return result;
	};

	return EnyoCachedFileManager;
};


function LessPluginEnyoCache(options) {
	this.options = options;
}

LessPluginEnyoCache.prototype = {
	install: function (less, pluginManager) {
		var EnyoPlugin = getEnyoPlugin(less);
		pluginManager.addFileManager(new EnyoPlugin(this.options));
	},
	printUsage: function () { },
	setOptions: function (options) {
		this.options = options;
	},
	minVersion: [2, 0, 0]
};

module.exports = LessPluginEnyoCache;