# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Base44 Sandbox Setup (docker-compose.base44.yml)

- This app's backend is the **Base44 platform itself**, run via the `base44` CLI + Deno (`base44 dev`), not code in this repo. The repo holds only the Vite/React frontend plus entity/function definition files under `base44/`.
- `docker-compose.base44.yml` runs the **frontend standalone** (`npm run dev` / Vite on port 3000). With no backend, `base44.app.getPublicSettings()` 404s on boot, so `AuthContext` falls through and `ProtectedRoute` redirects to `/login` — the login page renders. API calls (`/api/...`) fail until a backend exists.
- `vite.config.js` adds `server: { host: true, port: 3000, allowedHosts: true }` so the sandbox preview can reach the dev server; keep this when running here.
- **Full functionality** (entities, auth, functions) requires the local Base44 backend. To enable it: provide `BASE44_ACCESS_TOKEN` + `BASE44_REFRESH_TOKEN` (from `~/.base44/auth/auth.json` after `base44 login`) and `BASE44_APP_ID` (from the Builder URL) as secrets, then switch the compose service to install Deno + the `base44` CLI and run `base44 link --app-id $BASE44_APP_ID && base44 dev` (the CLI seeds auth from those env vars via `seedAuthFromEnv`, replacing interactive login; `base44 dev` does NOT accept `--app-id` — linking writes `base44/.app.jsonc` first).
- Verify the frontend: `curl -s -o /dev/null -w "%{http}" http://localhost:3000/` → 200, and the preview shows the login page.
