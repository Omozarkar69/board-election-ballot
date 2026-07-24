import { BoardSimulator } from "./board-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";
import { State } from "../../contracts/managed/board_voting/contract/index.js";

setNetworkId("undeployed");

describe("Corporate Board Election Smart Contract Tests", () => {
  const adminSecret = randomBytes(32);
  const electionId = randomBytes(32);

  // Setup helper to create a simulator
  const setupSimulator = (userSecret: Uint8Array) => {
    const tempSim = new BoardSimulator(adminSecret, electionId, new Uint8Array(32));
    const adminPk = tempSim.publicKey(adminSecret);
    return new BoardSimulator(userSecret, electionId, adminPk);
  };

  it("1. Properly initializes election parameters and admin PK", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret);
    const ledgerState = simulator.getLedger();

    expect(ledgerState.election_id).toEqual(electionId);
    expect(ledgerState.state).toEqual(State.ACTIVE);
  });

  it("2. Lets admin whitelist board members", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret);
    const voterPk = randomBytes(32);

    // Switch to admin to whitelist
    simulator.switchUser(adminSecret);
    const ledgerState = simulator.registerVoter(voterPk);
    expect(ledgerState.voters.member(voterPk)).toEqual(true);
  });

  it("3. Allows a whitelisted member to vote for a candidate", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret);
    const userPk = simulator.publicKey(userSecret);

    // Whitelist
    simulator.switchUser(adminSecret);
    simulator.registerVoter(userPk);

    // Cast vote for candidate ID 4
    simulator.switchUser(userSecret);
    const ledgerState = simulator.castVote(4n);

    expect(ledgerState.candidate_votes.lookup(4n)).toEqual(1n);
  });

  it("4. Throws when an unregistered member tries to vote", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret);

    // Attempt to vote without being whitelisted
    expect(() => simulator.castVote(1n)).toThrow("failed assert: Voter is not registered");
  });

  it("5. Throws when a board member tries to vote twice", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret);
    const userPk = simulator.publicKey(userSecret);

    // Whitelist
    simulator.switchUser(adminSecret);
    simulator.registerVoter(userPk);

    // Vote once
    simulator.switchUser(userSecret);
    simulator.castVote(2n);

    // Vote twice
    expect(() => simulator.castVote(3n)).toThrow("failed assert: Voter has already voted");
  });
});
