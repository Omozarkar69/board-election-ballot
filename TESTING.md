# Verification checklist

The executable contract suite is `src/test/board.test.ts`.

```bash
npm test
npm run compile
npm run build
```

Five passing scenarios cover election initialization, board-member whitelisting, a valid private vote, unregistered-member rejection, and duplicate-vote protection. The tests verify that vote choice remains private while eligibility and tally rules remain enforceable.

CI runs the contract and frontend verification jobs on every push and pull request.
