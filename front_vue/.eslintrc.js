module.exports = {
  root: true,
  env: {
    node: true,
    jest: true
  },
  'extends': [
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    'plugin:vue/recommended',
    '@vue/standard'
  ],
  rules: {
    indent: 'off',
    'vue/script-indent': ['error', 2, { baseIndent: 1 }],
    'no-console': 'off',
    'no-debugger': 'off',
    'import/no-extraneous-dependencies': 'off'
  },
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
    ecmaFeatures: {
      modules: true
    }
  }
}
