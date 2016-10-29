var	path = require('path');
var fs = require('graceful-fs');
var glob = require('glob');
var EnyoLessCachePlugin = require('./less-cache-plugin');
var jsLoader = path.join(__dirname, 'enyo-js-loader.js');
var lessLoader = path.join(__dirname, 'enyo-less-loader.js');

function hotwireWriteFile() {
	try {
		var NodeOutputFileSystem = module.parent.require('webpack/lib/node/NodeOutputFileSystem');
		NodeOutputFileSystem.prototype.writeFile = fs.writeFile.bind(fs);
	} catch(e) {
		console.log('WARNING: EnyoPlugin will not function locally with a global Webpack context');
		console.log(e);
	}
}

function addLessCachePlugin(options, libs, refs) {
	options.lessLoader = options.lessLoader || {};
	options.lessLoader.lessPlugins = options.lessLoader.lessPlugins || [];
	options.lessLoader.lessPlugins.push(new EnyoLessCachePlugin({libs:libs, refs:refs}));
}

function exists(file) {
	try {
		return !!(fs.statSync(file));
	} catch(e) {
		return false;
	}
}

function shouldEmit(compilation, src, dest, callback) {
	var srcStat = fs.statSync(src);
	if(srcStat.isDirectory()) {
		callback(true);
	} else {
		var destPath = path.join(compilation.options.output.path, dest);
		compilation.inputFileSystem.stat(destPath, function(err, destStat) {
			if(err) {
				callback(true);
			} else {
				callback((srcStat.mtime.getTime()>destStat.mtime.getTime()));
			}
		});
	}
}

function addAssets(compilation, files, callback) {
	if(files.length===0) {
		callback();
	} else {
		var f = files.shift();
		var out = path.relative(process.cwd(), f).replace(/\.\.(\/)?/g, "_$1")
		shouldEmit(compilation, f, out, function(should) {
			if(should) {
				fs.readFile(f, function(err, data) {
					if(err) {
						console.log('ERROR: Unable to read asset: ' + f);
						compilation.errors.push(err);
					} else {
						compilation.assets[out] = {
							size: function() { return data.length; },
							source: function() { return data; },
							updateHash: function(hash) { return hash.update(data); },
							map: function() { return null; }
						};
					}
					addAssets(compilation, files, callback);
				});
			} else {
				addAssets(compilation, files, callback);
			}
		})
	}
}

function handleResources(compilation) {
	var manifestPath = 'resources/ilibmanifest.json';
	if(!exists(manifestPath)) {
		var data = JSON.stringify({files:[]}, null, '\t');
		compilation.assets[manifestPath] = {
			size: function() { return data.length; },
			source: function() { return data; },
			updateHash: function(hash) { return hash.update(data); },
			map: function() { return null; }
		};
	}
}

function isLibraryBase(libs, dir) {
	var curr = path.basename(dir);
	var parent = path.basename(path.dirname(dir));
	return (parent=='node_modules' && libs.indexOf(curr)>=0);
}

function libraryDir(libs, file) {
	var dir;
	for(var i=0; i<libs.length; i++) {
		var id = path.join('node_modules', libs[i]);
		var index = file.indexOf(id);
		if(index>=0) {
			dir = file.substring(0, index+id.length);
		}
	}
	return dir;
}

function EnyoPlugin(options) {
	this.options = options || {};
	this.options.libs = this.options.libs || [
		'enyo',
		'onyx',
		'moonstone',
		'spotlight',
		'layout',
		'enyo-ilib', 
		'enyo-webos',
		'canvas',
		'svg'
	];
}

module.exports = EnyoPlugin;
EnyoPlugin.prototype.apply = function(compiler) {
	var libs = this.options.libs;
	var entries = {};
	var assets = [];
	var styles = {};
	var lessRefs = {};
	var scanned = [];
	
	// Hotwire graceful-fs into webpack to avoid EMFILE errors with ilib assets
	hotwireWriteFile();

	// Inject custom LESS plugin to add cache support for Enyo reference files
	addLessCachePlugin(compiler.options, libs, lessRefs);

	// Detect the first raw entry for each chunk
	var handleEntry = function(context, entry) {
		if(typeof entry === 'string') {
			entries[entry] = true;
		} else if(Array.isArray(entry)) {
			if(entry.length>0) {
				entries[entry[0]] = true;
			}
		} else if(typeof entry === 'object') {
			var keys = Object.keys(entry);
			for(var x in entry) {
				handleEntry(context, entry[x])
			}
		}
	};
	compiler.plugin("entry-option", handleEntry);

	compiler.resolvers.normal.plugin('directory', function(request, callback) {
		var pkg;
		try {
			pkg = JSON.parse(fs.readFileSync(path.join(request.path, 'package.json'), {encoding:'utf8'}));
		} catch(e) {}
		if(pkg) {
			if(scanned.indexOf(request.path)===-1) {
				// Discover assets the first time the package.json is used
				pkg.assets = pkg.assets || [];
				for(var i=0; i<pkg.assets.length; i++) {
					var aResults = glob.sync(pkg.assets[i], {cwd:request.path, nodir:true});
					for(var j=0; j<aResults.length; j++) {
						aResults[j] = path.join(request.path, aResults[j]);
						if(assets.indexOf(aResults[j])===-1) {
							assets.push(aResults[j]);
						}
					}
				}

				// Discover the asssociated stylesheets
				var main = path.join(request.path, pkg.main || 'index.js');
				styles[main] = [];
				pkg.styles = pkg.styles || [];
				for(var k=0; k<pkg.styles.length; k++) {
					var cResults = glob.sync(pkg.styles[k], {cwd:request.path, nodir:true});
					for(var l=0; l<cResults.length; l++) {
						cResults[l] = path.relative(path.dirname(main), path.join(request.path, cResults[l]));
						if(styles[main].indexOf(cResults[l])===-1) {
							styles[main].push(cResults[l]);
						}
					}
				}

				// Mark down any top-level library LESS for reference in child stylesheets
				if(isLibraryBase(libs, request.path)) {
					lessRefs[request.path] = [];
					for(var r=0; r<styles[main].length; r++) {
						lessRefs[request.path].push(path.join(request.path, styles[main][r]));
					}
				}

				scanned.push(request.path);
			}
			

			// Check if request is for an Enyo-based library module and
			// if the request isn't the core main entry
			if(libs.indexOf(path.basename(request.path))>=0 && request.request
					 && pkg.main!==request.request) {
				// Only add moduleDir if it needs it
				var moduleDir = pkg.moduleDir || 'src';
				if(request.request.replace(/^\.[\/\\]/, '').indexOf(moduleDir)!==0) {
					this.doResolve(["file", "directory"], {
						path: path.join(request.path, moduleDir),
						query: request.query,
						request: request.request
					}, function(err, result) {
						if(!err && result) {
							callback(null, result);
						} else {
							callback();
						}
					});
				}
			} else {
				callback();
			}
		} else {
			callback();
		}
	});

	// After resolve, inject any needed extra loaders for our custom file handling
	compiler.plugin('normal-module-factory', function(factory) {
		factory.plugin('after-resolve', function(data, callback) {
			switch (path.extname(data.resource)) {
				case '.less':
					var d = libraryDir(libs, data.resource);
					if(d) {
						data.loaders.push(lessLoader + '?' + JSON.stringify({
							refs: lessRefs[d]
						}));
					}
					break;
				case '.js':
				case '.jsx':
				case '.es6':
					data.loaders.unshift(jsLoader + '?' + JSON.stringify({
						styles: styles[data.resource] || [],
						isEntry: entries[data.rawRequest]
					}));
			}
			callback(null, data);
		});
	});

	compiler.plugin('emit', function(compilation, callback) {
		// Emit all discovered assets
		addAssets(compilation, assets, callback);
		// Emit a ./resources/ilibmanifest if it doesn't exist
		handleResources(compilation);
	});

	// This plugin includes a LOT of extra output, so ignore the 'extract-text-webpack-plugin'
	compiler.plugin('done', function(stats) {
		if(stats && stats.compilation && stats.compilation.children) {
			var keys = [
				'extract-text-webpack-plugin'
			];
			for(var i=0; i<stats.compilation.children.length; i++) {
				var child = stats.compilation.children[i];
				if(keys.indexOf(stats.compilation.children[i].name)>-1) {
					stats.compilation.children.splice(i, 1);
					i--;
				}
			}
		}
	});
};
