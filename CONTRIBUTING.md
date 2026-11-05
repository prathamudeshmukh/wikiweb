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

- the **gate** (first entry, `error`): total transfer size, script transfer size and layout shift. Byte sizes are today's plus ~5 %, so the job fails when the first screen gets heavier;
- the **targets** (second entry, `warn`): performance score, LCP, TBT and time to interactive at SPEC §15.9's budget and Google's "good" thresholds, plus the accessibility, best-practices and SEO scores. They show in the job summary but never fail it.

Timings are not gated because GitHub's shared runners differ in CPU from job to job, and Lighthouse's simulated timings scale with it: on one build, LCP ranged 3.7–10.5 s and the performance score 0.36–0.82, while byte sizes moved under 0.1 % (SPEC §15.9). The summary prints the runner's CPU benchmark index so a bad timing can be read against it.

### Tightening the gate

When a change makes the first screen lighter, ratchet the gate in the same pull request: set each byte budget to the new size plus ~5 % (one run is enough — bytes don't vary), never raise a budget to let a regression through, and record the numbers in SPEC §15.9.

### When the gate is wrong

- A new dependency or screen that is worth its bytes: raise the budget in the same pull request and say why in SPEC §15.9.
- An urgent fix on `main` that the gate stops: the staged deployment is still on Vercel; promote it by hand (`vercel promote <url>`, or Promote in the dashboard), then follow up.

### Running it locally

```
npx -y @lhci/cli@0.15.1 autorun --collect.url=https://gotangent.app/ --upload.target=filesystem
```

Results land in `.lighthouseci/` (git-ignored). Byte sizes match CI; timings and scores depend on your machine.
