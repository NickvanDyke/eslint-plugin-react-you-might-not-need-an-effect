#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEMP_PREFIX = "eslint-react-effects-";
const PLUGIN_NAME = "eslint-plugin-react-you-might-not-need-an-effect";

async function main(): Promise<void> {
	const originalCwd = process.cwd();
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: npx ${PLUGIN_NAME} [eslint options] <files...>

IMPORTANT: Run this command from your project directory (cd to your project first)

Examples:
  cd /path/to/your/project
  npx ${PLUGIN_NAME} "src/**/*.jsx"
  npx ${PLUGIN_NAME} --fix "src/**/*.{js,jsx,ts,tsx}"
  npx ${PLUGIN_NAME} "components/**/*.tsx"

This tool creates a temporary environment with ESLint and the plugin,
runs linting, then cleans up. All arguments are passed to ESLint.
Only React effect pattern rules are enabled (no other ESLint rules).
`);
		process.exit(0);
	}

	let tempDir: string | undefined;
	let exitCode = 0;

	try {
		console.log("🔧 Setting up temporary linting environment...");
		tempDir = mkdtempSync(join(tmpdir(), TEMP_PREFIX));

		// Create minimal package.json
		const packageJson = {
			name: "temp-eslint-runner",
			version: "1.0.0",
			type: "module",
		};
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify(packageJson, null, 2),
		);

		// Install dependencies
		console.log("📦 Installing ESLint and plugin...");
		const installResult = spawnSync(
			"npm",
			[
				"install",
				"--no-save",
				"--silent",
				"eslint",
				"typescript-eslint",
				PLUGIN_NAME,
			],
			{
				cwd: tempDir,
				stdio: "inherit",
			},
		);

		if (installResult.status !== 0) {
			throw new Error("Failed to install dependencies");
		}

		// Create ESLint config - only React effect rules
		const configContent = `import plugin from "${PLUGIN_NAME}";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: [],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  plugin.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
];
`;
		const configPath = join(tempDir, "eslint.config.js");
		writeFileSync(configPath, configContent);

		console.log("🔍 Running ESLint...\n");

		// Symlink node_modules to original directory so ESLint can find dependencies
		const nodeModulesLink = join(originalCwd, "node_modules_temp_eslint");
		try {
			symlinkSync(join(tempDir, "node_modules"), nodeModulesLink, "dir");
		} catch (_err) {
			// Symlink might already exist or fail on some systems, continue anyway
		}

		// Copy config to original directory
		const tempConfigPath = join(originalCwd, "eslint.config.temp.mjs");
		// Update config to use relative imports from the symlinked node_modules
		const portableConfig = configContent
			.replace(
				`import plugin from "${PLUGIN_NAME}";`,
				`import plugin from "./node_modules_temp_eslint/${PLUGIN_NAME}/src/index.js";`,
			)
			.replace(
				`import tseslint from "typescript-eslint";`,
				`import tseslint from "./node_modules_temp_eslint/typescript-eslint/dist/index.js";`,
			);
		writeFileSync(tempConfigPath, portableConfig);

		// Run ESLint from original directory
		// Note: ESLint 9 will error on unknown rules in eslint-disable comments
		// We capture output and filter those errors
		const eslintResult = spawnSync(
			`${nodeModulesLink}/.bin/eslint`,
			[
				"-c",
				tempConfigPath,
				"--no-config-lookup",
				"--no-warn-ignored",
				"--format",
				"json",
				...args,
			],
			{
				cwd: originalCwd,
			},
		);

		// Parse and filter results
		if (eslintResult.stdout) {
			try {
				const results = JSON.parse(eslintResult.stdout.toString());
				let hasPluginIssues = false;

				for (const file of results) {
					const filtered = file.messages.filter(
						(msg: { ruleId: string | null }) =>
							msg.ruleId?.startsWith("react-you-might-not-need-an-effect/"),
					);

					if (filtered.length > 0) {
						hasPluginIssues = true;
						console.log(`\n${file.filePath}`);
						for (const msg of filtered) {
							const type = msg.severity === 2 ? "error" : "warning";
							console.log(
								`  ${msg.line}:${msg.column}  ${type}  ${msg.message}  ${msg.ruleId}`,
							);
						}
					}
				}

				if (hasPluginIssues) {
					console.log("");
				}
			} catch (_parseErr) {
				// If JSON parsing fails, show raw output
				console.error(eslintResult.stdout?.toString() || "");
				console.error(eslintResult.stderr?.toString() || "");
			}
		}

		// Cleanup
		try {
			rmSync(tempConfigPath, { force: true });
			rmSync(nodeModulesLink, { force: true, recursive: true });
		} catch {
			// Ignore cleanup errors
		}

		// Don't exit with error for unknown rule errors
		exitCode = 0;
	} catch (error) {
		console.error("❌ Error:", (error as Error).message);
		exitCode = 1;
	} finally {
		// Cleanup
		if (tempDir) {
			try {
				console.log("\n🧹 Cleaning up...");
				rmSync(tempDir, { recursive: true, force: true });
			} catch (_cleanupError) {
				console.warn("⚠️  Failed to clean up temp directory:", tempDir);
			}
		}
	}

	process.exit(exitCode);
}

main();
