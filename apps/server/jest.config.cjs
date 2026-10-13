const path = require('path');

const rootDir = __dirname;

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir,
  roots: [path.join(rootDir, 'src')],
  testMatch: ['**/*.spec.ts'],
  transform: { '^.+\.(t|j)s$': 'ts-jest' },
  modulePaths: [rootDir],
  moduleNameMapper: {
    '^src/(.*)$': `${rootDir}/src/$1`,
    '^@darnozom/shared-types/dto$': path.join(rootDir, '../../lib/shared-types/src/lib/dto/index.ts'),
    '^@darnozom/shared-types$': path.join(rootDir, '../../lib/shared-types/src/index.ts'),
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};
