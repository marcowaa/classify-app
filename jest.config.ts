/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "bundler",
          esModuleInterop: true,
          target: "ES2022",
        },
      },
    ],
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverageFrom: [
    "server/**/*.ts",
    "shared/**/*.ts",
    "!server/index.ts",
    "!server/vite.ts",
  ],
};
