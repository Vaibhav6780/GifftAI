const { baseConfig } = require("./base");

module.exports = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { process: "readonly", __dirname: "readonly", module: "writable" },
    },
    rules: {
      "no-console": "off",
    },
  },
];
