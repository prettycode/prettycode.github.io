module.exports = [
  { ignores: ["node_modules/**", ".vite/**"] },
  {
    files: ["**/*.{js,jsx,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      curly: ["error", "all"],
      "no-unused-vars": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    // Loaded as classic browser scripts, including JSX compiled by Babel.
    files: ["lib/**/*.{js,jsx}"],
    languageOptions: { sourceType: "script" },
  },
];
