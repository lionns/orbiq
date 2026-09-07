// eslint-config-next 16 exporta un array de configuraciones planas, no una función.
import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "playwright-report/**", "test-results/**"] },
  ...next,
];

export default config;
