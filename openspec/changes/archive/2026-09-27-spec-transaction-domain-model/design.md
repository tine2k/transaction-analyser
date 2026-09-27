# Design

## Context

The repository contains only OpenSpec scaffolding — no application source, package manifest, or test setup — so there is no existing code, architecture, or convention for a domain model to sit inside. See proposal.md for motivation.

Constraints that shape this design:

- The deliverable of this change is a written specification, not code. The apply phase writes no production source.
- No implementation language or framework has been chosen, and choosing one is out of scope.
- The user has explicitly excluded storage and validation/constraint modelling from this change.
- This is the project's first capability; `openspec/specs/` is empty, so there is no established capability layout to follow beyond a flat kebab-case path.

## Goals / Non-Goals

**Goals:**

- Pin down the *shape* of the domain: which elements a `Transaction` carries, and the presence of each.
- Settle the three modelling choices that later work would otherwise re-litigate: money direction, counterparty account representation, and date precision.
- Write the shape as testable behaviour (requirements + scenarios) so a later implementation change can be validated against it without re-deriving the intent.
- Keep the model deliberately small — one aggregate, no dependent entities.

**Non-Goals:**

- Any language, framework, or type-system decision.
- Persistence and storage of any kind (see Risks for why this is safe to defer).
- Validation and business constraints: IBAN checksum and format, `valueDate >= bookingDate` ordering, non-zero amount, field length limits, required-non-empty checks. The spec says which fields are present; it deliberately does not say which field *values* are acceptable.
- Immutability or equality semantics of the aggregate, beyond it being read as one indivisible unit.
- Categorisation, aggregation, reporting, import/parsing, and any analysis behaviour.

## Decisions

### D1 — Money direction is carried by the sign of the amount, not a separate discriminator

A single signed decimal (positive = money in, negative = money out) is the only representation of direction.

*Rationale:* one field instead of two cannot become self-contradictory. A separate `DEBIT`/`CREDIT` enum plus a positive amount can represent states that are not meaningful (a credit of a negative amount) and needs an invariant to keep the pair consistent. The sign makes the inconsistency unrepresentable. It also matches how bank statements already present amounts, which reduces translation friction when import arrives.

*Alternative considered:* positive `amount` plus a `direction` enum. Rejected for the contradiction surface described above. Kept as a viable later refinement only if a consumer needs direction as a discrete label for display; that would be an added read-model concern, not a change to the stored model.

### D2 — The counterparty account is one optional IBAN string, not a nested value object

The counterparty is the pair (name, optional IBAN) held directly on the transaction.

*Rationale:* IBAN is a single self-describing string with its own check digits; a wrapper object would add a type boundary carrying no behaviour and no constraints (constraints are out of scope). Making it optional is required by real data: cash withdrawals and merchant card payments have a counterparty name but no counterparty account.

*Alternative considered:* a `Counterparty` value object wrapping name + account. Rejected as an extra layer with nothing to enforce yet. If constraints arrive later (IBAN validation, normalisation to uppercase without spaces), promoting the field to a value object is a local refactor that does not change the spec's observable behaviour, which is why deferring is cheap.

*Alternative considered:* modelling the counterparty as its own aggregate that transactions reference. Rejected — it would add identity, lifecycle, and reference-integrity questions that this deliberately simple model has no answer to, and the user asked for a single main aggregate.

### D3 — Booking date and value date are two separate day-precise dates

*Rationale:* the two dates carry different business meaning (posting vs. availability) and collapse irreversibly at import. Both are required, and the spec deliberately does not assert `valueDate >= bookingDate` — see Non-Goals and R2.

*Alternative considered:* one date plus a day offset. Rejected as less direct to read and to reason about.

Day precision only: no time component. *Rationale:* the domain question being asked is "on which day did this settle", and a time component would imply a precision the source data does not reliably carry.

### D4 — The purpose line is unstructured free text, held verbatim

*Rationale:* it is a description, not a classification. Deriving a category from it is analysis behaviour and belongs to a later change with its own spec. The spec pins preservation of the text and explicitly disclaims derivation, so a future categorisation feature does not silently re-interpret this capability.

### D5 — Capability path `transaction-domain-model`, flat

*Rationale:* the project has no existing spec organisation, so the path is introduced flat rather than inventing a domain grouping (`finance/...`, `domain/...`) with nothing to nest under.

### D6 — The amount's currency is fixed to EUR rather than stored

*Rationale:* a stored currency field would be an eighth data element that, with EUR-only scope, could only ever hold one value. Fixing it keeps the aggregate minimal. Multi-currency is a real future need and is deferred to its own change; it would be a `MODIFIED Requirements` change to the amount requirement, not a silent extension.

## Risks / Trade-offs

- **R1 — The spec is written with no implementation to check it against.** A domain model agreed on paper can still turn out to be awkward to express in the chosen language. → Mitigation: the model is six elements with no behaviour, no invariants, and no dependent entities, so it is expressible as a plain record/data class in essentially any language. The risk is limited to ergonomics, not feasibility. The first implementation change should revisit this spec before building on it.

- **R2 — No constraints means invalid data can be represented.** A transaction with `valueDate` before `bookingDate`, a malformed IBAN, or a zero amount is representable. → Mitigation: intentional. Constraints are out of scope by request, and the spec's silence is not an endorsement — it is an open question. The rules for when to enforce them (at import, at construction, at read) are themselves a design decision, so they are deferred to the change that introduces constraints rather than pre-empted here.

- **R3 — Deferring the language risks rework.** A type chosen now might argue for a different shape (e.g. a currency enum rather than fixed EUR). → Mitigation: the deferred decisions are recorded here and in proposal.md, and each is a scoped `MODIFIED Requirements` change rather than a rewrite. No downstream work exists yet to be disrupted.

- **R4 — Deferring storage means a persistence change may reshape the model** (for example, requiring a surrogate ID or splitting counterparty into its own table for reuse across transactions). → Mitigation: the spec constrains observable behaviour, not the stored shape, so a later storage change can normalise the schema without contradicting this capability. Splitting a counterparty into a referenced entity *would* contradict the "held on the transaction" requirement and is called out there deliberately, so the tension surfaces at proposal time instead of being discovered later.

## Migration Plan

Not applicable. No code, schema, or deployed system is touched by this change; the only artefact is the spec itself, which is additive and has no consumers yet.

## Open Questions

Each of these is safe to answer later without changing the specs, the approach, or the task breakdown of this change. They are listed so they are not lost, not because they block:

- Which language and framework will express the model.
- Whether the counterparty IBAN field should eventually be normalised (uppercase, spaces stripped) and where that rule lives.
- Whether consumers need direction as a discrete label for display, independent of the amount's sign (see D1).
- What the eventual constraint set is, and at which boundary each rule is enforced (see R2).
- Whether the counterparty name should ever be split into first/last or organisation name.
