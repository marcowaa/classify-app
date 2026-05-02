# Work Plan: Trial Cards + Upload + Daily Reward + AgeGate

## Scope

- Unify trial account explainer cards (parent/child) with timed random appearance and click-to-section navigation.
- Fix admin upload flow reliability and support files larger than 150MB.
- Improve Gem Kingdom daily reward dismiss behavior.
- Fix AgeGate slider behavior in Arabic and simplify age wording.

## Phases

### Phase 1: Planning and Baseline

- [x] Identify affected files and current behavior.
- [x] Confirm upload limits and entry points.

### Phase 2: Upload Reliability (>150MB)

- [x] Increase server request body limits where needed.
- [x] Ensure APK upload route accepts large file payloads safely.
- [x] Keep image upload limits unchanged for security.

### Phase 3: Trial Cards UX

- [x] Add timed random display behavior for trial-context hint cards.
- [x] Keep unified card style.
- [x] Add click action to route user to related section.

### Phase 4: Gem Kingdom Daily Reward UX

- [x] Keep auto-dismiss after successful claim.
- [x] Add outside-click dismiss behavior.
- [x] Keep explicit cancel/close option.

### Phase 5: AgeGate UX Cleanup

- [x] Fix Arabic slider direction/value mapping.
- [x] Remove persona age labels (child/teen/young style words).
- [x] Improve readability/organization without adding new locale keys.

### Phase 6: Verification

- [x] TypeScript check.
- [x] Production build.
- [x] Tests.

### Phase 7: Closeout

- [x] Update this plan with final status.
