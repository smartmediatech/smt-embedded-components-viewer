# Accessibility suite mocks backend data but keeps the components and tenant config live

The accessibility suite exists to catch WCAG regressions in the viewer and the components, and run against a shared sandbox account it failed for reasons that had nothing to do with either: a feed that went empty within an hour, a tenant whose giveaways render a different card, and a Lab card face with an unnamed button. So in its default mode (mocked mode) the suite answers all backend data (feed items, user, wallet, SMT records, session tokens) and the card face from fixtures in this repo, and fails on any backend request it has no fixture for. It still loads the components and each tenant config live from the sandbox, because those are product code from the components repo: a theme, layout or card-variant change that breaks WCAG must turn the suite red as soon as it is deployed.

## Considered options

- **Real data with a signed-in test user** (the original setup): needs login secrets in CI and fails whenever sandbox content changes.
- **Recording and replaying all traffic (HAR)**: deterministic, but the recording holds real tokens and personal data, is opaque to review, and freezes the components and tenant config too, so it would miss the regressions the suite is for.
- **Mocking the tenant config as well**: rejected for the same reason; the tenant config is the most likely source of contrast and layout regressions.

## Consequences

- CI needs no secrets: mocked mode makes up its own session.
- A components release or tenant config change on the sandbox can still change the results. That is intended; those are real changes.
- Findings that come from Lab card faces are only visible in live mode (real data, opt-in, local), and belong to whoever owns the Lab.
- With fixed data, a known finding that stops occurring in mocked mode fails the run, so its entry is removed together with the fix.
