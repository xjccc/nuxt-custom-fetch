import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import typescriptParser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['dist', '.nuxt', '.output', 'playground/.nuxt', 'commitlint.config.ts']
  },
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: typescriptParser
    },
    rules: {
      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: 1,
          outerIIFEBody: 1,
          MemberExpression: 1,
          FunctionDeclaration: {
            parameters: 'first',
            body: 1
          },
          FunctionExpression: {
            parameters: 'first',
            body: 1
          },
          CallExpression: {
            arguments: 'first'
          },
          ArrayExpression: 'first',
          ObjectExpression: 'first',
          ImportDeclaration: 'first',
          flatTernaryExpressions: false,
          ignoreComments: false
        }
      ],
      'prettier/prettier': [0, { semi: false }],
      'space-before-blocks': [2, 'always'],
      'space-before-function-paren': 0,
      'comma-dangle': [2, 'never'],
      semi: [2, 'never'],
      quotes: [2, 'single', 'avoid-escape'],
      'operator-linebreak': [
        2,
        'after',
        {
          overrides: {
            '?': 'before',
            ':': 'before'
          }
        }
      ],
      'function-paren-newline': ['error', 'multiline'],
      'object-curly-spacing': ['error', 'always'],
      'object-curly-newline': [
        'error',
        {
          multiline: true,
          consistent: true
        }
      ],
      'object-property-newline': [
        'error',
        {
          allowAllPropertiesOnSameLine: false
        }
      ]
    }
  }
]
