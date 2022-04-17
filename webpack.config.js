const {webpackConfig, relDir} = require("./webpack.common");

module.exports = {
  entry: {
    index: relDir("src/index.ts"),
    demo: relDir("src/demo.ts"),
    blockDemo: relDir("src/blockDemo.ts"),
  },
  ...webpackConfig(false),
};
