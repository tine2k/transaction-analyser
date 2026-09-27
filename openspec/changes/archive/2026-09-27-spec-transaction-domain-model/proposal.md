# Proposal

## Why

The project has no domain model yet, so there is nothing to build an analyser on top of. Before any code, storage, or analysis is written, we need a written agreement on what a transaction *is* in this domain: which fields it carries, how money direction is expressed, and what the counterparty looks like. Agreeing on that in a spec first keeps later parsing, storage, and analysis decisions from each inventing their own shape.

## What Changes

- Introduce the `transaction-domain-model` capability: a written specification of the `Transaction` aggregate.
- Specify the `Transaction` aggregate with: booking date, value date, signed EUR amount, purpose line, and counterparty name plus counterparty account (IBAN).
- Specify that the EUR amount is a single signed value — negative for money out, positive for money in — rather than a positive amount plus a separate direction discriminator.
- Specify that the counterparty account is modelled as one optional IBAN string rather than a nested value object, and that it is optional because cash and card transactions have no counterparty account.
- Deliberately exclude, for now: persistence/storage decisions, validation and business constraints (IBAN checksum, date ordering, amount non-zero, length limits), and any categorisation, aggregation, or reporting behaviour.
- No production code is written by this change. Its deliverable is the specification itself.

## Capabilities

### New Capabilities

- `transaction-domain-model`: The core domain vocabulary of the analyser — the `Transaction` aggregate, its fields, the signed-EUR amount convention, and the counterparty shape. Behaviour, not storage: no persistence, validation rules, or import/analysis requirements are in scope.

### Modified Capabilities

None. This is the first capability in the project; `openspec/specs/` is currently empty.

## Impact

- **New spec capability**: `openspec/specs/transaction-domain-model/spec.md` (created on archive).
- **Code**: none. The repository currently contains only OpenSpec scaffolding and no application source, package manifest, or test setup, so there is nothing to modify and no stack chosen to modify it in.
- **Downstream**: this spec becomes the contract that any future change adding persistence, statement import, or analysis must conform to. Those changes are explicitly out of scope here and should each get their own proposal.
- **Open questions deferred**: the language and framework the model will be expressed in, the persistence technology, and the full constraint set are all intentionally left open and undecided by this change.
