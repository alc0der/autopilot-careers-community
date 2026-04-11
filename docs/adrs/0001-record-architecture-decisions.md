# 1. Record architecture decisions

Date: 2026-04-11

## Status

Accepted

## Context

We need to record architectural decisions made on this project so that future contributors (human and AI) can understand *why* the system is shaped the way it is, not just *what* it looks like today.

The project already uses Structurizr for C4 modelling and embedded documentation. Structurizr has first-class support for ADRs via the `!adrs` directive and the adr-tools format.

## Decision

We will use Architecture Decision Records (ADRs) as described by Michael Nygard, stored in `docs/adrs/` and imported into the Structurizr workspace with the `!adrs` directive.

## Consequences

- Each architecturally significant decision gets a numbered markdown file.
- Decisions are visible alongside C4 diagrams in the Structurizr UI.
- Superseded decisions remain in the repository for historical context.
