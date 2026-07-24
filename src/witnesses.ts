import { Ledger } from "../contracts/managed/board_voting/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type BoardPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createBoardPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, BoardPrivateState>): [
    BoardPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
