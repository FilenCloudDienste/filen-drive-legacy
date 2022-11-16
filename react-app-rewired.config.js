const webpack = require("webpack")

module.exports = {
    webpack: (config) => {
		config.module.rules.unshift({
			test: /\.m?js/,
			resolve: {
				fullySpecified: false
			}
		})

		config.ignoreWarnings = (config.ignoreWarnings || []).concat([/Failed to parse source map/])

		const fallback = config.resolve.fallback || {}

		Object.assign(fallback, {
			"crypto": require.resolve("crypto-browserify"),
			"stream": require.resolve("stream-browserify"),
			"assert": require.resolve("assert"),
			"http": require.resolve("stream-http"),
			"https": require.resolve("https-browserify"),
			"os": require.resolve("os-browserify"),
			"url": require.resolve("url"),
			"path": require.resolve("path-browserify"),
			"zlib": require.resolve("browserify-zlib"),
			"fs": require.resolve("browserify-fs")
		})

		config.resolve.fallback = fallback

		config.plugins = (config.plugins || []).concat([ 
			new webpack.ProvidePlugin({ 
			 	process: "process/browser", 
		   		Buffer: ["buffer", "Buffer"] 
		 	})
		])
	
		return config
    }
}