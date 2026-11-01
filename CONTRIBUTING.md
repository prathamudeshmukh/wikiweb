# Contributing

## Setup

```
npm install
```

## Running the app

```
npm start
npm run web
npm run ios
npm run android
```

## Tests

```
npm test
npm run test:coverage
```

## Lint and typecheck

```
npm run lint
npm run typecheck
```

## Lighthouse gate

CI runs [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) on every deployment: the pull request's preview, and on `main` a production build staged without the domain. `/` is audited three times (mobile, Lighthouse's default throttling) and each metric's median is checked against `lighthouserc.json`. On a pull request a failure blocks the merge; on `main` it stops the promote job, so production keeps the last build that passed.

`lighthouserc.json` has two assertion sets:

- the **gate** (first entry, `error`): today's numbers plus headroom, so the job fails on a regression;
- the **targets** (second entry, `warn`): SPEC §15.9's budget and Google's "good" thresholds. They show in the job summary but never fail it.

### Tightening the gate

When a change makes the first screen faster, ratchet the gate to the new numbers in the same pull request:

1. Re-run the Lighthouse job about five times on the pull request (Actions → the run → Re-run jobs).
2. For each gate metric, take the worst of those medians and add ~10 % to timings and ~5 % to byte sizes, and take ~0.05 off scores.
3. Lower the `error` thresholds to those values (never raise them to make a regression pass) and record the numbers in SPEC §15.9.

### When the gate is wrong

- A noisy runner: re-run the failed job.
- An urgent fix on `main` that the gate stops: the staged deployment is still on Vercel; promote it by hand (`vercel promote <url>`, or Promote in the dashboard). Follow up by fixing the regression or ratcheting with a reason.

### Running it locally

```
npx -y @lhci/cli@0.15.1 autorun --collect.url=https://gotangent.app/ --upload.target=filesystem
```

Results land in `.lighthouseci/` (git-ignored). Laptop numbers differ from the CI runner's; set thresholds from CI runs only.
