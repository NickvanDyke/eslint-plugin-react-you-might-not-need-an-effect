import { ESLint } from "eslint";
import plugin from "../src/index.js";
import assert from "assert";
import { js } from "./rule-tester.js";
import { LegacyESLint } from "eslint/use-at-your-own-risk";

describe("recommended config", () => {
  const code = js`
    import { useState, useEffect } from "react";

    const MyComponent = () => {
      const [state, setState] = useState(0);
      const [otherState, setOtherState] = useState(0);

      useEffect(() => {
        setState(otherState * 2);
      }, [state]);
    };
  `;

  it("flat", async () => {
    const results = await new ESLint({
      // Use `overrideConfig` so it ignores the project's config
      // FIX: Seems to merge, not replace
      overrideConfig: [plugin.configs.recommended],
    }).lintText(code);

    assert.ok(
      results[0].messages
        .map((m) => m.ruleId)
        .includes("react-you-might-not-need-an-effect/no-derived-state"),
    );
  });

  it("legacy", async () => {
    const results = await new LegacyESLint({
      overrideConfig: {
        extends: [
          "plugin:react-you-might-not-need-an-effect/legacy-recommended",
        ],
        parserOptions: {
          // To support the syntax in the code under test
          ecmaVersion: 2020,
          sourceType: "module",
        },
      },
    }).lintText(code);

    assert.ok(
      results[0].messages
        .map((m) => m.ruleId)
        .includes("react-you-might-not-need-an-effect/no-derived-state"),
    );
  });

  it("should not report no-derived-state when explicitly disabled", async () => {
    const eslint = new ESLint({
      overrideConfig: [
        plugin.configs.recommended,
        {
          rules: {
            "react-you-might-not-need-an-effect/no-derived-state": "off",
          },
        },
      ],
    });

    const results = await eslint.lintText(code);
    const ruleIds = results[0].messages.map((m) => m.ruleId);
    assert.ok(
      !ruleIds.includes("react-you-might-not-need-an-effect/no-derived-state"),
    );
  });
});
