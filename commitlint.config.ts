/** @type {import('cz-git').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'update', 'docs', 'style', 'refactor', 'test', 'revert', 'bug', 'build', 'ci', 'chore', 'perf']]
  },
  prompt: {
    useEmoji: true,
    types: [
      {
        value: 'feat',
        name: 'feat: A new feature',
        emoji: '✨'
      },
      {
        value: 'update',
        name: 'update: Config or Function Update',
        emoji: '🙌'
      },
      {
        value: 'fix',
        name: 'fix: A bug fix',
        emoji: '🐛'
      },
      {
        value: 'docs',
        name: 'docs: Documentation only changes',
        emoji: '📚'
      },
      {
        value: 'style',
        name: 'style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
        emoji: '💎'
      },
      {
        value: 'refactor',
        name: 'refactor: A code change that neither fixes a bug nor adds a feature',
        emoji: '📦'
      },
      {
        value: 'perf',
        name: 'perf: A code change that improves performance',
        emoji: '🚀'
      },
      {
        value: 'test',
        name: 'test: Adding missing tests or correcting existing tests',
        emoji: '🚨'
      },
      {
        value: 'build',
        name: 'build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
        emoji: '🛠'
      },
      {
        value: 'ci',
        name: 'ci: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
        emoji: '⚙️'
      },
      {
        value: 'chore',
        name: "chore: Other changes that don't modify src or test files",
        emoji: '♻️'
      },
      {
        value: 'revert',
        name: 'revert: Reverts a previous commit',
        emoji: '🗑'
      }
    ]
  }
}
