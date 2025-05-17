import assert from "node:assert";
import { RuleTester } from "eslint";
import { name as ruleName, rule as myRule } from "../src/rule.js";

// For syntax highlighting inside code under test
export const js = String.raw;

// Generic name I know, but it does a couple things, and inheritance is annoying.
//
// Normalizes whitespaces between the expected and actual `output` for tests with fixes.
// Because formatting seriously complicates the fixer implementation and most people have a formatter anyway.
// Not sure how hacky this is.
// Seems like it might be standard practice for ESLint plugins?
// Even the TS ESLint plugin mentions that it does not concern itself with formatting.
//
// Supports labelling tests as `todo` (and there's always more to do).
export class MyRuleTester extends RuleTester {
  constructor(options) {
    super({
      ...options,
      languageOptions: {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
    });
  }

  run(variation, tests) {
    const originalStrictEqual = assert.strictEqual;
    try {
      assert.strictEqual = (actual, expected, ...rest) => {
        if (typeof actual === "string" && typeof expected === "string") {
          return originalStrictEqual(
            normalizeWhitespace(actual),
            normalizeWhitespace(expected),
            ...rest,
          );
        }
        return originalStrictEqual(actual, expected, ...rest);
      };

      const { valid = [], invalid = [] } = tests;

      [...valid, ...invalid]
        .filter((test) => test.todo)
        .forEach((test) => {
          it.skip(test.name);
        });

      const filteredTests = {
        valid: valid.filter((test) => !test.todo),
        invalid: invalid.filter((test) => !test.todo),
      };

      super.run(ruleName + variation, myRule, filteredTests);
    } finally {
      // Restore the original strictEqual function to avoid unintended effects
      assert.strictEqual = originalStrictEqual;
    }
  }
}

const normalizeWhitespace = (str) =>
  typeof str === "string" ? str.replace(/\s+/g, " ").trim() : str;
