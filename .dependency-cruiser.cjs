/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment:
        "Circular dependencies make feature slices harder to reason about.",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "shared-components-do-not-import-server",
      severity: "warn",
      comment:
        "Shared UI should stay presentational and avoid server/data boundaries.",
      from: {
        path: "^src/components/",
      },
      to: {
        path: "^src/server/",
      },
    },
    {
      name: "app-router-avoids-direct-db-access",
      severity: "warn",
      comment:
        "Route files should prefer feature query/action seams over direct DB access.",
      from: {
        path: "^src/app/",
      },
      to: {
        path: "^src/server/db",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    enhancedResolveOptions: {
      conditionNames: ["types", "import", "require", "node", "default"],
      exportsFields: ["exports"],
    },
    tsPreCompilationDeps: true,
  },
};
