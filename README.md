# Board Election Ballot

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
| Chain | Midnight Preprod |
| Contract | `board_voting` |
| Address | `e993870c54966c0b712be1f6066f7867a06a4be845e84366c91deed98850c3bb` |
| Transaction | `dcb74c11c18bdecee5bfaaa4f4b4a334cefbf408d5f7f6ecc292d2586134124b` |
| Confirmation | Preprod indexer confirmed |

## Start the console

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

Deployment is available for a configured Preprod wallet:

```bash
npm run deploy
```

Only use synthetic board data and testnet funds.

## Maintainer checks

Frontend CI validates the UI. Contract CI validates Compact compilation and tests. Tagged releases publish the frontend, generated contract directory, and manifest. A separate scheduled workflow reports npm audit output.

Demo: [see the board election console](https://drive.google.com/file/d/1tUmh5BuoCrX1R5ozWo42vJ1Ke858IbR1/view?usp=sharing).

