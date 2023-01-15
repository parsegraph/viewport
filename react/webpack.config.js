const path = require("path");
const mode = process.env.NODE_ENV || "development";

module.exports = {
  mode: mode,
  entry: {
    demo: "./src/demo.tsx",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    modules: ["src", "node_modules"]
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(png)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(s?css)$/,
        use: ["style-loader", "css-loader"],
        // {
        //   loader: "postcss-loader",
        //   options: {
        //     postcssOptions: {
        //       plugins: function () {
        //         return [require("autoprefixer")];
        //       },
        //     },
        //   },
        // },
      },
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      }
    ],
  },
  devtool: "inline-source-map"
};

