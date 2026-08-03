# Board Election Ballot

![Frontend CI](https://github.com/Omozarkar69/board-election-ballot/actions/workflows/frontend-ci.yml/badge.svg?branch=main) ![Contract CI](https://github.com/Omozarkar69/board-election-ballot/actions/workflows/contract-ci.yml/badge.svg?branch=main)

A boardroom election console for private weighted voting and publicly verifiable aggregate outcomes.

## Boardroom scenario

The project is designed for director elections where the existence of a ballot and the final totals should be auditable, but a director’s individual choice should remain private. The gold-and-navy interface exposes election phase, candidate totals, participation health, wallet readiness, privacy notes, and the deployed contract identity.

## Voting model

The `board_voting` contract provides:

- `registerVoter(voter_pk)` for enrollment.
- `castVote(candidate_id)` for a private candidate selection.
- `closeElection()` for finalization.
- `computeNullifier(sk, id)` to stop duplicate participation.

Its public ledger contains candidate vote totals, enrollment flags, nullifiers, election state, election identifier, and administrator key. The private share-weight witness is not rendered as public application data.

## Deployment card

| Item | Recorded value |
| --- | --- |
| Chain | Midnight Preview |
| Contract | `board_voting` |
| Address | `ed12ee1919c913885d34ac06765cad97b70697825781261103728541f631dcac` |
| Transaction | `005774db4e5f315bfcac95e7dfb5deeb13fa1e61ffcfb3d9f87880be47b7d66c52` |
| Election deployer | `mn_addr_preview16hg5m688497gjt2gkglp8cjx2uvyy8lj6k22zt304slczk4mmvvq3k46zl` |
| Chain timestamp | `2026-08-03T19:01:02.499Z` |
| Confirmation | Preview indexer confirmed |

## Start the console

Board-election test accounts can request tNight at the [Preview faucet](https://faucet.preview.midnight.network/).

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

Deployment is available for a configured Preview wallet:

```bash
npm run deploy
```

Only use synthetic board data and testnet funds.

## Maintainer checks

Frontend CI validates the UI. Contract CI validates Compact compilation and tests. Tagged releases publish the frontend, generated contract directory, and manifest. A separate scheduled workflow reports npm audit output.

Demo: [see the board election console](https://drive.google.com/file/d/1tUmh5BuoCrX1R5ozWo42vJ1Ke858IbR1/view?usp=sharing).

## Verification

Privacy is the product feature: board-member eligibility and aggregate totals are auditable, but each director’s candidate choice stays private. Run `npm test`, `npm run compile`, and `npm run build`; the five contract scenarios are documented in [TESTING.md](./TESTING.md), the product scope is in [PROPOSAL.md](./PROPOSAL.md), and both CI workflows run on every push and pull request.
