# ADR: Inventory Company Domains And Package Custody

## Status

Accepted

## Context

Inventory serves two separate company domains. Merchandising and secret-shopping jobs may carry packages to stores, while contract-parts jobs use serialized, contract-backed equipment. The original local ledger and queue were keyed only by job ID.

## Decision

Jobs without an explicit inventory domain default to `merchandising`. Contract-parts jobs must opt in with `inventoryDomain: "contract_parts"`. Ledger, queue, evidence references, and catalog behavior are resolved within that domain. Merchandising uses package identifier/contents and delivery evidence; contract-parts retains strict part-number/serial matching.

Legacy v1 merchandising records migrate without deletion. Their original hash canonicalization is retained for verification; new events use domain-aware canonicalization.

## Consequences

- The Inventory page makes company context explicit and never mixes job lists between domains.
- Existing jobs remain usable under the confirmed merchandising default.
- No seeded job currently represents the contract-parts domain, so that domain stays empty until a job is explicitly marked.
- Durable server-side multi-tenant storage is still a future requirement.
