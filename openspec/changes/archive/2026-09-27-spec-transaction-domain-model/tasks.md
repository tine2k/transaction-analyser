# Tasks

## 1. Spec Review and Refinement

The deliverable of this change is the specification itself — see proposal.md. No production source, package manifest, or test suite is to be created by this change. These tasks review and verify the spec already drafted in `specs/transaction-domain-model/spec.md`; they do not add behaviour beyond it.

- [x] 1.1 Re-read `specs/transaction-domain-model/spec.md` against the six data elements in proposal.md and confirm every element appears in the requirement table with a presence of Required or Optional — verify no seventh element and no omitted element
- [x] 1.2 Confirm each requirement's scenarios collectively cover all four presence combinations the counterparty account implies (account present with a name, account absent, both dates differing, both dates equal) — verify by tracing each scenario back to a stated THEN outcome
- [x] 1.3 Confirm the spec asserts no validation or business constraint (no IBAN checksum, no date-ordering rule, no non-zero rule, no length or required-non-empty rule) — verify by searching the spec for such claims and finding none, per proposal.md "What Changes" and design.md Non-Goals
- [x] 1.4 Confirm the spec asserts nothing about storage, persistence, categorisation, or analysis — verify the same way, per design.md Non-Goals
- [x] 1.5 Review the spec for technology-specific content (class or function names, framework or library choices, execution steps) and remove anything found, since no language has been chosen — verify by re-reading with design.md D1–D6 as the reference for what the spec is allowed to pin

## 2. Consistency Between Artifacts

- [x] 2.1 Confirm each decision in design.md (D1 signed amount, D2 optional IBAN string, D3 two day-precise dates, D4 verbatim free text, D5 capability path, D6 EUR fixed) is reflected by a corresponding requirement in the spec — verify each decision maps to at least one `### Requirement` heading
- [x] 2.2 Confirm each deferred item recorded in design.md Open Questions is deliberately absent from the spec as a normative requirement — verify none of the five open questions has been silently decided in the spec
- [x] 2.3 Confirm proposal.md Impact still matches reality: capability path is `transaction-domain-model`, and the "no application source" statement is still true — verify the path matches the spec file's location and `openspec/specs/` is still empty

## 3. Validation

- [x] 3.1 Run `openspec validate spec-transaction-domain-model --strict` from the repository root and verify it reports no errors for this change
- [x] 3.2 Confirm the spec is ready to archive by reviewing the delta against the template rules in the OpenSpec schema — verify it opens with `## Purpose`, uses only `##` delta headers, and every `### Requirement` has at least one `#### Scenario` with WHEN/THEN bullets
