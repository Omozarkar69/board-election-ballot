# Project Idea: Private Voting (Corporate Board of Directors Election)

A weighted voting system for board of directors elections where votes are weighted by share ownership. The individual votes and the voter's share balances remain completely private, while the final tally is publicly verifiable.

## 1. Midnight Network Specialty (ZK & Privacy Features)
*   **Weighted Anonymity:** Solves the challenge of voting where voting power varies (e.g., share ownership) without revealing how many shares a voter owns or how they voted.
*   **Balance Commitments:** Integrates the voter's private token/share balance into the ZK proof, verifying that the vote weight matches their holdings without exposing their actual balance to the public ledger.
*   **Spam and Replay Protection:** Emits nullifiers to block double-voting.

## 2. Technical Architecture (Compact Contract)
*   **Public State:**
    *   `election_id`: Unique election identifier.
    *   `candidate_tallies`: Map of candidates to their weighted votes.
    *   `shareholders_root`: Merkle root hash of registered shareholder accounts.
    *   `nullifiers`: List of used nullifiers.
*   **Private State:**
    *   `shareholder_private_key`: Shareholder's private key.
    *   `share_balance`: The number of shares owned by the voter.
    *   `balance_proof`: Merkle membership path to `shareholders_root`.
*   **Circuits (ZK Proofs):**
    *   `cast_weighted_vote(candidate, share_balance, balance_proof, shareholder_private_key)`:
        1. Checks that the public key derived from `shareholder_private_key` and their `share_balance` match the Merkle commitment in `shareholders_root`.
        2. Computes the `nullifier = hash(shareholder_private_key, election_id)`.
        3. Confirms that `nullifier` has not been used.
        4. Increments the `candidate_tallies[candidate]` by the `share_balance`.
        *Output:* The updated candidate tally and the nullifier hash are posted on-chain.

## 3. Frontend & Integration (Level 3 Focus)
*   **User Interface:** A shareholder voting dashboard displaying the election candidates, the shareholder's private voting power (shares), and vote buttons. The voting weight is calculated and verified off-chain.
*   **Lace/Midnight Wallet Integration:**
    *   Retrieves private shareholder keys and balance commitments.
    *   Compiles weighted ZK ballot proofs locally.

## 4. Verification & Testing Plan
*   **Unit Tests:**
    *   Assert that a shareholder owning 500 shares can cast a vote and the candidate's tally increases by exactly 500.
    *   Assert that a shareholder cannot misrepresent their share balance (e.g., claiming 10,000 shares when they only own 500) because the Merkle check will fail.
    *   Assert that double voting is rejected via the nullifier check.

---

## 5. How to Build & Deploy on Midnight
To build this project without errors, refer to the master build guide located at the root of the workspace: [BUILD_GUIDE.md](file:///Users/neelsubhashpote/moonlight/BUILD_GUIDE.md). It details how to:
1. Fix language pragma version mismatches.
2. Resolve SDK `4.x` dependency issues.
3. Start the Docker-based local ZK proof server.
4. Deploy the contract using a custom `deploy.mjs` script.
5. Prevent DUST gas errors.
