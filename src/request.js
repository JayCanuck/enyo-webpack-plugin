// Enyo-style request() result is a pseudo-Promise that only runs on a then() command.
function Request(exec) {
	var resolve, reject, promise, fired;
	promise = new Promise(function (r1, r2) {
		resolve = r1;
		reject  = r2;
	});
	this.then = function then () {
		promise.then.apply(promise, arguments);
		if (!fired) {
			fired = true;
			exec(resolve, reject);
		}
	};
}

/*
 * Enyo-style:
 *
 * var ABC = request('abc');
 * ABC.then(...);
 *
 *
 * Webpck replacement:
 *
 * var request = require(....);
 * var ABC = request(function(cb) { require.ensure(['abc'], function(require) { cb(require('abc')); }) });
 * ABC.then(...);
 */

module.exports = function(target, ensureExec) {
	var req = new Request(function (resolve, reject) {
		ensureExec(function(result) {
			resolve(result);
		});
	});
	return req;
};
module.exports.isRequest = function(req) {
	return req != null && req instanceof Request;
};
