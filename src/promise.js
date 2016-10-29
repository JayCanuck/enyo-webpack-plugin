if(typeof window === 'object' && typeof Promise === 'undefined') {
	require('promise/lib/rejection-tracking').enable();
	window.Promise = require('promise/lib/es6-extensions');
}
