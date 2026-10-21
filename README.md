# Portfolio

Dedicated source repository for the Portfolio frontend and membership API, migrated from the former isolated `portfolio-site` branch in `Ronin2494/lyricsverse`, source commit `630212cb8ff1a58a6f19bbaad949ee87dd658a24`.

- `portfolio-site/` — frontend, original images, UI, creator editing, test suite.
- `portfolio-membership-api/` — Node backend, Firebase authorization, MongoDB GridFS, and PayPal integration.
- `.github/workflows/portfolio-visual-quality.yml` — syntax and regression CI.

## Validation

```sh
node --check portfolio-membership-api/server.js
node --test portfolio-site/tests/*.test.mjs
```

## Render source configuration

Both existing Render services must deploy from **`Ronin2494/Portfolio` branch `master`**.

Frontend `deepak-portfolio`: static publish path `portfolio-site`, build command `echo 'Static portfolio ready'`.

API `badbunny-membership-api`: build `npm --prefix portfolio-membership-api install --omit=dev --no-audit --no-fund`; start `npm --prefix portfolio-membership-api start`.

Keep the original Render services, environment variables and secrets, Firebase project, MongoDB data and GridFS media, PayPal config, and public URLs. Nothing sensitive belongs in Git.

The previous 2024 Portfolio website is preserved on branch `archive/portfolio-2024-before-migration`. The pre-migration source remains historically referenced by its original commit in LyricsVerse.
