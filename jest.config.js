/**
 * Jest Configuration for Summarize This
 * 
 * Comprehensive testing configuration with coverage reporting,
 * test environment setup, and custom matchers.
 */

module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The root directory that Jest should scan for tests and modules
  rootDir: '.',
  
  // A list of paths to directories that Jest should use to search for files
  roots: [
    '<rootDir>/server',
    '<rootDir>/src',
    '<rootDir>/public',
    '<rootDir>/tests'
  ],
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/tests/**/*.(js|jsx|ts|tsx)'
  ],
  
  // File extensions to consider
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Transform files before testing
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(module-to-transform)/)',
    '\\.pnp\\.[^\\\/]+$'
  ],
  
  // Module name mapping for imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@public/(.*)$': '<rootDir>/public/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Setup files to run before each test
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'server/**/*.js',
    'src/**/*.js',
    'public/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/tests/**',
    '!server/test.js',
    '!public/enhanced-ui/**',
    '!public/responsive/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './server/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Files to ignore for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/',
    '/public/assets/',
    '/public/uploads/',
    'webpack.config.js',
    'jest.config.js',
    '.eslintrc.js',
    '.prettierrc.js'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Reset modules between tests
  resetModules: false,
  
  // Reset mocks between tests
  resetMocks: false,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',
  
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    'json',
    'text',
    'lcov',
    'html',
    'clover'
  ],
  
  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // A path to a module which exports an async function that is triggered once before all test suites
  globalSetup: undefined,
  
  // A path to a module which exports an async function that is triggered once after all test suites
  globalTeardown: undefined,
  
  // A set of global variables that need to be available in all test environments
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.JWT_SECRET': 'test-secret',
    'process.env.STRIPE_SECRET_KEY': 'sk_test_123',
    'process.env.OPENAI_API_KEY': 'test-openai-key'
  },
  
  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',
  
  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
    '<rootDir>/server',
    '<rootDir>/tests'
  ],
  
  // A map from regular expressions to module names or to arrays of module names
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@public/(.*)$': '<rootDir>/public/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],
  
  // Activates notifications for test results
  notify: false,
  
  // An enum that specifies notification mode
  notifyMode: 'failure-change',
  
  // A preset that is used as a base for Jest's configuration
  preset: undefined,
  
  // Run tests from one or more projects
  projects: undefined,
  
  // Use this configuration option to add custom reporters to Jest
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true
      }
    ]
  ],
  
  // Automatically reset mock state between every test
  resetMocks: false,
  
  // Reset the module registry before running each individual test
  resetModules: false,
  
  // A path to a custom resolver
  resolver: undefined,
  
  // Automatically restore mock state between every test
  restoreMocks: true,
  
  // The root directory that Jest should scan for tests and modules within
  rootDir: undefined,
  
  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>'
  ],
  
  // Allows you to use a custom runner instead of Jest's default test runner
  runner: 'jest-runner',
  
  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: [],
  
  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // The number of seconds after which a test is considered as slow and reported as such in the results
  slowTestThreshold: 5,
  
  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  snapshotSerializers: [],
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // Options that will be passed to the testEnvironment
  testEnvironmentOptions: {},
  
  // Adds a location field to test results
  testLocationInResults: false,
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // The regexp pattern or array of patterns that Jest uses to detect test files
  testRegex: [],
  
  // This option allows the use of a custom results processor
  testResultsProcessor: undefined,
  
  // This option allows use of a custom test runner
  testRunner: 'jest-circus/runner',
  
  // This option sets the URL for the jsdom environment
  testURL: 'http://localhost',
  
  // Setting this value to 'fake' allows the use of fake timers for functions such as setTimeout
  timers: 'real',
  
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\\/]+$'
  ],
  
  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  unmockedModulePathPatterns: undefined,
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Whether to use watchman for file crawling
  watchman: true,
  
  // Test environment options for different test types
  testEnvironments: {
    node: {
      testEnvironment: 'node',
      testMatch: [
        '**/server/**/*.test.js',
        '**/tests/server/**/*.js'
      ]
    },
    jsdom: {
      testEnvironment: 'jsdom',
      testMatch: [
        '**/public/**/*.test.js',
        '**/src/**/*.test.js',
        '**/tests/client/**/*.js'
      ]
    }
  }
};

