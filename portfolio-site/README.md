# Portfolio frontend

Animated, accessible static frontend with a cosmic gateway, project constellation and bento cards, creative bubble panels, creator editor and private gallery.

## Local testing

```sh
cd portfolio-site
python3 -m http.server 8080
```

A network connection is needed for external scripts, video and the optional backend. JavaScript tests can be run from repository root with `node --test portfolio-site/tests/*.test.mjs`.

## Deployment

Render static site source: `Ronin2494/Portfolio`, branch `master`, publish directory `portfolio-site`, build command `echo 'Static portfolio ready'`.

The frontend uses the existing membership API service at `https://badbunny-membership-api.onrender.com`. Do not relocate secret values to the frontend.
