# Product Proposal: Board Election Ballot

**Track:** Other — corporate governance  
**Election repository owner:** `Omozarkar69`  
**Ballot status:** Preview-deployed MVP

## Problem

Board elections need verifiable totals while protecting each director’s individual choice and share-weight witness.

## Proposed product

Board Election Ballot provides a private candidate-selection workflow with enrollment, one-time participation, aggregate candidate totals, and controlled closeout.

## Privacy model

Candidate totals, election phase, and nullifier activity can be audited. Individual director choices and private weighting witnesses are not exposed.

## User journey

1. Administrator registers directors.
2. A director casts a private candidate ballot.
3. The dashboard updates aggregate election state.
4. Administrator closes the election.

## Success criteria

- Registration is administrator-only.
- Duplicate ballots are blocked.
- Candidate totals are accurate.
- Closed elections cannot continue accepting votes.
