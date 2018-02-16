const path = require( "path" ),
  webpack = require( "webpack" ),
  HtmlWebpackPlugin = require( "html-webpack-plugin" );

module.exports = {
  target: "node",
  entry: "./test/te2.js",
  devtool: "inline-source-map",
  output: {
    path: path.resolve( __dirname, "target" ),
    filename: "[name].js"
  },
  devServer: {
    public: "127.0.0.1",
    disableHostCheck: true,
    host: "0.0.0.0",
    compress: true,
    port: 9000,
    hot: true
  },
  module: {
    rules: [ {
      test: /\.tsx?$/,
      loader: "ts-loader",
      exclude: /node_modules/

    }, {
      test: /\.js$/,
      loader: "babel-loader",
      exclude: /node_modules/
    } ]
  },
  resolve: {
    extensions: [ ".ts", ".tsx", ".js" ],
    alias: {
      "@": path.resolve( __dirname, "src" ),
    }
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin( {
      template: path.resolve( __dirname, "./test/testing.html" )
    } )
  ]
};
