module.exports = {
  entry: "./index.js",
  devtool: "source-map",
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
    extensions: [ ".ts", ".tsx", ".js" ]
  }
};
