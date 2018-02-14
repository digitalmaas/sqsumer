'use strict'

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  env: {
    'jest/globals': true
  },
  plugins: [
    'jest'
  ],
  extends: [
    'standard',
    'plugin:jest/recommended'
  ],
  rules: {
    'arrow-parens': 0,
    'generator-star-spacing': 0,
    'padded-blocks': 0,
    'import/first': 0
  }
}
