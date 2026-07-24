import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../../contracts/managed/board_voting/contract/index.js";
import { type BoardPrivateState, witnesses } from "../witnesses.js";

export class BoardSimulator {
  readonly contract: Contract<BoardPrivateState>;
  circuitContext: CircuitContext<BoardPrivateState>;

  constructor(secretKey: Uint8Array, id: Uint8Array, adminPk: Uint8Array) {
    this.contract = new Contract<BoardPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey }, "0".repeat(64)),
      id,
      adminPk
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  public switchUser(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): BoardPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public registerVoter(voterPk: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerVoter(
      this.circuitContext,
      voterPk,
    ).context;
    return this.getLedger();
  }

  public castVote(candidateId: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.castVote(
      this.circuitContext,
      candidateId,
    ).context;
    return this.getLedger();
  }

  public publicKey(sk: Uint8Array): Uint8Array {
    return this.contract.circuits.publicKey(
      this.circuitContext,
      sk,
    ).result;
  }
}
