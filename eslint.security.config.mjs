import base from "./eslint.config.mjs";
import security from "eslint-plugin-security";

const config = [
  ...base,
  { ...security.configs.recommended, files: ["src/**/*.{ts,tsx}", "scripts/*.mjs"], ignores: ["src/**/*.test.ts"] },
];
export default config;
