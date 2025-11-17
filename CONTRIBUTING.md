# Contributing to Invoice Merger

Thanks for helping improve Invoice Merger! This doc explains how we build, review, and ship changes so the desktop app stays stable for our accounting teams.

## Prerequisites

- Node.js 20.x and npm 10.x
- Windows 11 (Forge builds MSI installers with WiX)
- Git + Git LFS (if you touch large assets)

Install dependencies the usual way:

```bash
npm ci
```

## Development workflow

| Task                                | Command                  |
| ----------------------------------- | ------------------------ |
| Run Electron + Next.js locally      | `npm run dev`            |
| Build static renderer (Next export) | `npm run build:renderer` |
| Package Electron app                | `npm run package`        |
| Make MSI locally                    | `npm run make`           |

The renderer is exported with `NEXT_ASSET_PREFIX=app://-/` so Electron can serve files via the `app://` protocol.

## Branching, commits, and reviews

1. Never push directly to `main`. The branch is protected and requires pull requests.
2. Create feature branches from `main` (`feature/<summary>`).
3. Keep commits scoped and descriptive; reference Jira/issue IDs where possible.
4. Open a PR and request review from `@xp3r-inc/invoice-merger-maintainers`.
5. CI (`Build & Publish Invoice Merger`) must be green before merge.
6. At least one approval is required (enforced by CODEOWNERS + branch protection).

## Quality checks

- `npm run lint` - ESLint for both renderer + Electron code.
- `npm run test` - Vitest suite for shared libs.
- Smoke-test the Electron app (`npm run dev`) for any UI-facing change.

## Release & installer process

1. Bump `package.json` version (use `npm version <patch|minor|major>`).
2. Commit the bump and create a matching tag, e.g. `git tag v1.0.1`.
3. Push the branch and the tag (`git push origin HEAD --tags`).
4. GitHub Actions workflow `.github/workflows/release.yml` runs on the tag:
   - `npm ci`
   - `npm run publish -- --platform=win32 --arch=x64`
   - Electron Forge builds the WiX MSI via `@electron-forge/maker-wix`.
   - `@electron-forge/publisher-github` uploads artifacts to the GitHub Release.
5. Users get the update through `update-electron-app`, which hits `update.electronjs.org` and downloads the MSI from the Release.

> Tip: if you need to test publishing locally, set `GITHUB_TOKEN` and run `npm run publish`.

## Auto-update expectations

- The main process calls `updateElectronApp({ repo: 'XP3R-Inc/kalcon_pdf-merger' })`.
- Ensure every tag has the same semantic version as `package.json`; otherwise auto-updates may skip builds.
- Releases must stay **public** so `update.electronjs.org` can read them. For private builds, switch to a private feed and `electron-updater`.

## Applying branch protection

`main` is configured in `.github/branch-protection.yml`. To enforce or refresh the rules via GitHub CLI:

```bash
yq -o=json '.branches[] | select(.name==\"main\") | .protection' \
  .github/branch-protection.yml \
  > protection.json

gh api \
  repos/XP3R-Inc/kalcon_pdf-merger/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input protection.json
```

The command requires [`yq`](https://mikefarah.gitbook.io/yq/) to convert YAML -> JSON. Delete `protection.json` afterwards.

## Security & secrets

- Never commit client data or secrets.
- Use GitHub Encrypted Secrets for tokens (e.g., `GITHUB_TOKEN` is provided automatically in Actions).
- For code signing, add the cert/password via repository secrets and reference them only inside Actions.

## Need help?

Ping the maintainers in Slack `#invoice-merger` or mention `@xp3r-inc/invoice-merger-maintainers` in your PR.
