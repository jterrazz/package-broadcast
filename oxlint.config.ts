import { defineConfig, library, type OxlintConfig } from '@jterrazz/typescript/oxlint';

const config: OxlintConfig = defineConfig({ extends: [library] });

export default config;
