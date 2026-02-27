module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.spec.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: [
    "ts/cluster1/vault_init.ts",
    "ts/cluster1/claim_vault.ts",
    "ts/cluster1/cancel_lock_vault.ts",
    "ts/cluster1/programs/lockpay_vault.ts",
  ],
};