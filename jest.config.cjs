module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/client-tests/**/*.spec.ts"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.jest.json",
    },
  },
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "cluster1/lockpay_initialize_vault.ts",
    "cluster1/lockpay_claim.ts",
    "cluster1/lockpay_cancel.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
