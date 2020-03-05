module.exports = {
  root: true,
  env: {
    node: true,
    jest: true
  },
  'extends': [
    'plugin:vue/essential',
    '@vue/standard'
  ],
  rules: {
    'indent': 'off',
    'vue/script-indent': ['error', 2, { 'baseIndent': 1 }],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'import/no-extraneous-dependencies': 'off'
  },
  parserOptions: {
    parser: 'babel-eslint',
    ecmaFeatures: {
      "modules": true
    }
  }
}
