// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    vue: true,
    md: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false
    },
    lessOpinionated: true
  },
  {
    rules: {
      'vue/block-order': 0,
      'no-console': 0,
      'node/prefer-global/process': 0,
      'style/comma-dangle': [2, 'never'],
      'function-paren-newline': ['error', 'multiline'],
      'object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
      'object-curly-spacing': ['error', 'always'],
      'object-curly-newline': ['error', {
        multiline: true,
        consistent: true
      }],
      'style/space-before-function-paren': [2, 'always'],
      'style/space-before-blocks': [2, 'always']
    }
  }
)
