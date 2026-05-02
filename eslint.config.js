export default [
  {
    ignores: [
      "**/*.{ts,tsx}",
      "dist/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "appsflutter/**",
      "cat-game/**",
      "fullstack-mongo-app/**",
      "ice-age-game-master/**",
      "uploads/**",
      "logs/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {},
  },
];
