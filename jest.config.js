/** @type {import('jest').Config} */
const config = {
  moduleNameMapper: {
    '^[./a-zA-Z0-9$_-]+\\.png$': '<rootDir>/png.js',
  },
};

module.exports = config;
