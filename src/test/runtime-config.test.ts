import { describe, expect, it } from 'vitest';
import { verifyBoardElectionDeployment, validateBoardElectionDeploymentRuntime } from '../runtimeConfig';

const deployment = {
  contractName: 'board_voting',
  contractAddress: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  network: 'preview',
  transactionHash: '000000000000000000000000000000000000000000000000000000000000000000',
  deployedAt: '2026-08-03T18:00:00.000Z',
};

describe('Board Election Ballot production configuration', () => {
  it('accepts matching Preview deployment evidence', () => {
    expect(verifyBoardElectionDeployment(deployment).contractName).toBe('board_voting');
  });

  it('rejects evidence copied from another project', () => {
    expect(() => verifyBoardElectionDeployment({ ...deployment, contractName: 'foreign_contract' })).toThrow(/different contract/);
  });

  it('rejects malformed contract and transaction identifiers', () => {
    expect(() => verifyBoardElectionDeployment({ ...deployment, contractAddress: 'preview1bad' })).toThrow(/32-byte/);
    expect(() => verifyBoardElectionDeployment({ ...deployment, transactionHash: 'pending' })).toThrow(/transaction evidence/);
  });

  it('prevents demo mode and network drift in production', () => {
    expect(validateBoardElectionDeploymentRuntime({ networkId: 'preprod' }).networkId).toBe('preprod');
    expect(() => validateBoardElectionDeploymentRuntime({ production: true, demoMode: 'true' })).toThrow(/forbidden/);
  });
});
