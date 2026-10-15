---
name: premium-ui
description: Improve existing web application interfaces with premium visual design, systematic frontend refinement, and browser-based visual verification.
compatibility: opencode
metadata:
  opencode/slash: "true"
---

# Premium UI workflow

Use this skill whenever implementing, redesigning, or polishing an existing user interface.

## 1. Inspect before editing

- Read AGENTS.md and the relevant project documentation.
- Identify the framework, component library, styling approach, routes, and development commands.
- Inspect the existing page and related components.
- Run the application and inspect the current UI in the browser when possible.
- Record the main visual and usability problems before making changes.
- Preserve working functionality and existing design conventions unless there is a specific reason to change them.

## 2. Establish design direction

- Identify the user, the page's primary job, and its most important action.
- If useful, inspect 2–3 reference websites or supplied screenshots.
- Define a concrete visual direction before implementation.
- Consider typography, page composition, spacing, color, surfaces, borders, imagery, and interaction states.
- Prefer a cohesive, restrained, premium appearance over novelty for its own sake.
- Do not copy reference designs blindly; adapt their useful principles to the product.

## 3. Plan the changes

- List the highest-impact visual problems.
- Propose the intended layout and component changes.
- Identify reusable design tokens or components that should be introduced or corrected.
- Keep the scope limited to the target page and its necessary dependencies.
- For major redesigns, implement one representative page or section first.

## 4. Implement incrementally

Prioritize improvements in this order:

1. Information architecture and visual hierarchy.
2. Page layout, proportions, and whitespace.
3. Typography and readable content density.
4. Color, contrast, borders, and surface treatments.
5. Component consistency and interaction states.
6. Responsive behavior, accessibility, and fine details.

Use the project's existing stack. Avoid unnecessary dependencies, placeholder content, and arbitrary decorative elements.

## 5. Verify in the browser

- Open the actual application using the available browser tools.
- Navigate to the changed route and wait for it to render.
- Capture a screenshot at a representative desktop viewport.
- Inspect the page for clipping, overflow, awkward wrapping, inconsistent spacing, and visual imbalance.
- Check relevant mobile layouts and important interactive states.
- Inspect console errors and failed network requests when tools allow.
- Compare the result against the original UI and the intended design direction.

## 6. Run the visual feedback loop

After each meaningful implementation pass:

1. Inspect the rendered result.
2. Identify the three to five highest-impact defects.
3. Fix those defects in the code.
4. Reload and inspect the page again.
5. Repeat until no obvious high-impact visual defects remain or a real limitation prevents further progress.

Do not make arbitrary changes just to create more iterations. Every pass must address an observed issue.

## 7. Finish

- Run relevant tests, linting, and type checks where available.
- Recheck the final page in the browser.
- Summarize the changes and the verification actually performed.
- Report unresolved issues honestly.

Never claim visual verification without inspecting the rendered result.