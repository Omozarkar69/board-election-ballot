import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum State { ACTIVE = 0, CLOSED = 1 }

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerVoter(context: __compactRuntime.CircuitContext<PS>,
                voter_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  castVote(context: __compactRuntime.CircuitContext<PS>, candidate_id_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeElection(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerVoter(context: __compactRuntime.CircuitContext<PS>,
                voter_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  castVote(context: __compactRuntime.CircuitContext<PS>, candidate_id_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeElection(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array): Uint8Array;
  computeNullifier(sk_0: Uint8Array, id_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  registerVoter(context: __compactRuntime.CircuitContext<PS>,
                voter_pk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  castVote(context: __compactRuntime.CircuitContext<PS>, candidate_id_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeElection(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  computeNullifier(context: __compactRuntime.CircuitContext<PS>,
                   sk_0: Uint8Array,
                   id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly state: State;
  candidate_votes: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  voters: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly election_id: Uint8Array;
  readonly admin: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               id_0: Uint8Array,
               admin_pk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
