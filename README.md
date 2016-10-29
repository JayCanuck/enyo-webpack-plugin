# enyo-webpack-plugin
A webpack plugin that allows [Enyo](http://enyojs.com) code to build correctly.

## Why Is This Useful?

[EnyoJS](https://github.com/enyojs/enyo) is a cross-platform, established, and heavily battled-tested javascript framework that among other things, has powered LG TVs for several years now. It is designed in a CommonJS-like style with a number of customizations, and is packaged with a custom [enyo-dev](https://github.com/enyojs/enyo-dev) tool.

The plugin lets Webpack handle those CommonJS customizations and use the features/components from the Enyo framework. This allows you to combine the mature robust Enyo libraries with all the configurability and addons that Webpack has to offer.

## Requirements

* `webpack` 1.x only supported at this time
* `less-loader`, `css-loader`, `style-loader` in your `webpack.config.js` are required for correct LESS/CSS parsing
* `file-loader` and/or `uri-loader` in your `webpack.config.js` are required for correct asset handling

**IMPORTANT**: `json-loader` must not be used on Enyo library dependencies, as it will break `enyo-ilib` support. If you're using it in your project, please be sure to add appropriate include/exclude settings in your `webpack.config.js`.


## Install

```sh
npm install enyo-webpack-plugin --save-dev
```

## Configuration

In your webpack config include the plug-in. And add it to your config:

```js
var EnyoPlugin = require('enyo-webpack-plugin')

module.exports = {
    // ....
    plugins: [
		new EnyoPlugin()
	]
}
```

### Options

You can pass the following option:

#### `libs`

Optinal. `['enyo', 'onyx', 'moonstone', 'spotlight', 'layout', 'enyo-ilib', 'enyo-webos',	'canvas', 'svg']` by default.

Array of any possible Enyo library dependencies to handle.

```js
new EnyoPlugin({
	libs: [
		'enyo',
		'onyx',
		'moonstone',
		'spotlight',
		'layout',
		'enyo-ilib', 
		'enyo-webos',
		'canvas',
		'svg',
		'my-custom-lib'
	]
})
```

## Enyo Libraries as NPM Dependencies
This plugin requires the Enyo libraries to be included. This is simple, with the exception of `enyo-ilib`, which has trouble with NPM. A fixed version is available at [jaycanuck/enyo-ilib](https://github.com/jaycanuck/enyo-ilib). For example, an onyx ui app might have a `package.json` with:

```js
{
	//...
	"dependencies": {
		"enyo": "enyojs/enyo#2.7.0",
		"enyo-ilib": "jaycanuck/enyo-ilib#2.7.0",
		"layout": "enyojs/layout#2.7.0",
		"onyx": "enyojs/onyx#2.7.0"
	}
}
```

## Supported Features

* Includes a window.Promise polyfill
* Custom [`@.` notation](https://github.com/enyojs/enyo-dev#referencing-from-javascript) and `@@LIBRARY` notion scanning in strings in javascript.
* Support for [Enyo lazy-loading `request(..)`](https://enyojs.com/docs/latest/developer-guide/building-apps/performance/lazy-loading.html) via webpack's [`require.ensure(...)`](https://webpack.github.io/docs/code-splitting.html)
* Stylesheet detection - Checks resolved `package.json` object for any `styles` array and evaluate the globs, discovering associated LESS/CSS files and adding them into the build.
* File asset detection - Checks resolved `package.json` object for any `assets` array and evaluate the globs, discovering associated asset files and emits them in the build.
* For Enyo libraries, supports `package.json` custom property `moduleDir` which specifies a subdirectory to redirect the resolving to.
* For Enyo libraries, top-level LESS `styles` will be treated as cachable reference files for all other library LESS files to ensure variables/mixins are correctly available for components within the library.

## License

Unless otherwise specified, all content, including all source code files and documentation files in this repository are:

Copyright 2016 Jason Robitaille

Unless otherwise specified, all content, including all source code files and documentation files in this repository are: Licensed under the Apache License, Version 2.0 (the "License"); you may not use this content except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
