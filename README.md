# Dr Self Tape

## Production build

Production builds require `VITE_API_URL` in the build environment (or a Vite
`.env.production.local` file). The build fails early when it is missing, instead
of producing an app that fails at startup. Local `yarn dev` retains its localhost
API default.

For the production API already used by the repository's signup and persistence
smoke scripts:

```sh
VITE_API_URL=https://drselftape-api-production.up.railway.app/api yarn build
```

Use the appropriate API base URL for other deployments; there is no production
fallback. Vite embeds `VITE_*` values in the client bundle, so never put secrets in
them.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
