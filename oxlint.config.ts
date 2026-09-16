import { defineConfig, library } from '@jterrazz/typescript/oxlint';
import type { OxlintConfig } from '@jterrazz/typescript/oxlint';

const config: OxlintConfig = defineConfig({ extends: [library] });

export default config;
