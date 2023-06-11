import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  modulePaths: ["<rootDir>"],
  testPathIgnorePatterns: ["/db-test-config\\.ts"],
};
export default config;
