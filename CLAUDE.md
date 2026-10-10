# Claude Code Rules

## URL String Literals

Whenever you encounter a URL string literal in the code, add it to
`apps/client/src/lib/data/constants/routes.constants.ts` as an UPPERCASE constant
and import it from there instead of using the string directly.

Example:

- Instead of `router.push('/login')`, use `router.push(ROUTE_LOGIN)` imported from
  `@/lib/data/constants/routes.constants`.

## Organ Component Structure

Shared page-level components (organs) that contain forms or skeleton states **must** live in
a dedicated folder, not a flat file. **The same rule applies to route-local forms** under
`apps/client/src/app/.../__components/`: use `<form-name>/<form-name>.tsx` plus
`<form-name>/<form-name>.schema.ts` — never inline Yup in the component file.

See the full pattern in `apps/client/src/components/organs/ORGAN-PATTERN.md` (includes route-level forms).

```
organs/  (or app/.../__components/)
  <component-name>/
    <component-name>.tsx          # Main component
    <component-name>.schema.ts    # Yup schemas + TypeScript types only (no JSX)
    <component-name>.skeleton.tsx # Skeleton loading state (optional)
```

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
