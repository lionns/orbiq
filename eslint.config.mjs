// eslint-config-next 16 exporta un array de configuraciones planas, no una función.
import next from "eslint-config-next";

const config = [
  // `.open-next/` y `.wrangler/` los generan `npm run preview` y `deploy` (`T-031`): son compilados.
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "drizzle/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...next,
  {
    // AC-X03 deja de ser una promesa escrita y pasa a ser un comando que falla. El dominio se
    // invoca igual desde una pantalla, una ruta HTTP o un job (D-001), y eso solo se sostiene si
    // no puede importar el framework.
    files: ["src/domain/**/*.ts", "src/domain/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom", "server-only"],
              message:
                "src/domain/ no importa el framework (AC-X03, D-001). Si la lógica necesita Next, no es lógica de dominio.",
            },
          ],
        },
      ],
    },
  },
  {
    // `src/ui/` es presentación: no puede depender de una ruta concreta. Si un componente necesita
    // una acción de servidor, la recibe por parámetro — así también se puede mirar solo, fuera de
    // la aplicación.
    files: ["src/ui/**/*.tsx", "src/ui/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "../app/*", "next/headers", "next/navigation"],
              message:
                "src/ui/ no depende de src/app/. Pasa la acción o el dato por parámetro (T-006, T-007).",
            },
          ],
        },
      ],
    },
  },
];

export default config;
