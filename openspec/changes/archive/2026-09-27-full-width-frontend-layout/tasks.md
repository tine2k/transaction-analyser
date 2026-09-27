# Tasks

## 1. Full-width frame

- [x] 1.1 In `app/layouts/default.vue`, remove the `max-w-5xl` constraint from both the header's inner container and the `<main>` container, keeping `w-full` and the horizontal padding so the frame spans the viewport with an inset; verify by reading the file that neither container carries a maximum-width class and both keep a horizontal padding class.
- [x] 1.2 Run `npm run dev` and load the index route on a display wider than 64rem; verify in the browser that the header and page content extend to the full viewport width (with only the padding inset) rather than stopping at a centered narrow column.
- [x] 1.3 Navigate to an unmatched path so the failure page renders; verify it uses the same full-width frame, confirming the width comes from the default layout and not from the index route.
- [x] 1.4 Run `npm run build` and verify it completes without errors, confirming the class changes are accepted by the Tailwind build.

## 2. Integration

- [x] 2.1 Confirm the change matches the `frontend-shell` delta: exactly one layout, no route opts out, and no other frame behavior changed; verify with `openspec validate full-width-frontend-layout`.
