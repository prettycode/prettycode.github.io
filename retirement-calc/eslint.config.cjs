module.exports = [
  { ignores: ["node_modules/**", ".vite/**"] },
  {
    files: ["**/*.{js,jsx,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { curly: ["error", "all"] },
  },
];
