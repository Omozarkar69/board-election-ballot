import { useState, useEffect } from 'react';
import { Shield, Play, Database, History, Wallet, Cpu, Lock } from 'lucide-react';
import { submitBoardvotingCircuit } from './midnightClient';
import { verifyBoardElectionDeployment, validateBoardElectionDeploymentRuntime } from './runtimeConfig';

const RUNTIME = validateBoardElectionDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [ledger, setLedger] = useState({ candidate_alice: 4, candidate_bob: 2, total_board_votes: 6, resolution_id: "RESOLVE-INC-2026" });
  const [formValues, setFormValues] = useState({ candidate_choice: "ALICE", shareholder_sk: "" });
  const [logs, setLogs] = useState<any[]>([]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Verifying shareholder voting allocation balance...",
    "Computing board nullifier key to prevent double voting...",
    "Hashing shielded candidate choice parameter...",
    "Broadcasting board ballot proof..."
  ];

  const deploySteps = [
    "Setting up corporate board candidates list...",
    "Initializing quorum state variables...",
    "Deploying board_voting.compact on-chain..."
  ];

  useEffect(() => {
    fetch('/deployment.json')
      .then(response => {
        if (!response.ok) throw new Error('Board Election Ballot: deployment.json could not be loaded.');
        return response.json();
      })
      .then(deployment => {
        const verified = verifyBoardElectionDeployment(deployment);
        if (RUNTIME.contractAddress && RUNTIME.contractAddress !== verified.contractAddress) {
          throw new Error('Board Election Ballot: environment address does not match deployment evidence.');
        }
        setContractAddress(verified.contractAddress);
        setContractDeployed(true);
        setRuntimeIssue(null);
      })
      .catch(error => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(error instanceof Error ? error.message : 'Board Election Ballot: configuration failed.');
      });
    const detectLace = () => {
      const hasMidnightWallet = Object.values((window as any).midnight ?? {}).some((candidate: any) => typeof candidate?.connect === 'function');
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectLace = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values((window as any).midnight ?? {}) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
      }>;
      const wallet = candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(RUNTIME.networkId);
      (window as any).__midnightConnectedWallet = connected;
      const addressInfo = await connected.getUnshieldedAddress();
      const balances = await connected.getUnshieldedBalances();
      const nightBalance = Object.values(balances)[0] ?? 0n;

      setWalletAddress(addressInfo.unshieldedAddress);
      setWalletBalance((Number(nightBalance) / 1_000_000).toFixed(2));
      setWalletConnected(true);
      setConnectedWallet(connected);
      if (import.meta.env.VITE_CONTRACT_ADDRESS) {
        setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
        setContractDeployed(true);
      }
      logTransaction('wallet', 'MIDNIGHT WALLET CONNECTED', '—', 'Connected through the Midnight DApp Connector API');
    } catch (err) {
      console.error('Midnight wallet connection failed:', err);
      alert(err instanceof Error ? err.message : 'Midnight wallet connection failed.');
    } finally {
      setConnectingWallet(false);
    }
  };



  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction('0x0000...0000', 'LACE WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', 'Funding must be confirmed by the official Midnight Preview faucet and wallet balance refresh.');
  };

  const deployContractAction = async () => {
    if (!contractAddress || runtimeIssue) {
      alert('Board Election Ballot: no verified Preview deployment is available.');
      return;
    }
    setContractDeployed(true);
    logTransaction('—', 'VERIFIED DEPLOYMENT ATTACHED', '—', `Using finalized Preview contract ${contractAddress}`);
  };

  const voteBoard = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    try {
      const result = await submitBoardvotingCircuit((window as any).__midnightConnectedWallet, contractAddress, 'castVote', [BigInt(formValues.candidate_choice === 'ALICE' ? 0 : 1)]);
      setLedger(prev => formValues.candidate_choice === 'ALICE' ? { ...prev, candidate_alice: prev.candidate_alice + 1, total_board_votes: prev.total_board_votes + 1 } : { ...prev, candidate_bob: prev.candidate_bob + 1, total_board_votes: prev.total_board_votes + 1 });
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', 'Confirmed castVote on ' + contractAddress);
      return;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The Midnight transaction failed.');
      logTransaction('—', 'TRANSACTION FAILED', '—', err instanceof Error ? err.message : 'Unknown transaction failure');
      return;
    }

  };

  const logTransaction = (hash: string, status: string, fee: string, details: string) => {
    setLogs(prev => [
      {
        hash,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status,
        fee,
        details
      },
      ...prev
    ]);
  };

  if (runtimeIssue) {
    return (
      <main role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', background: '#080b12', color: '#f8fafc' }}>
        <section style={{ width: 'min(620px, 100%)', border: '1px solid #ef4444', borderRadius: '18px', padding: '28px', background: '#151922' }}>
          <p style={{ margin: 0, color: '#fca5a5', fontWeight: 800, letterSpacing: '0.08em' }}>SAFE START BLOCKED</p>
          <h1 style={{ margin: '12px 0', fontSize: 'clamp(1.7rem, 5vw, 2.6rem)' }}>Board Election Ballot</h1>
          <p style={{ lineHeight: 1.65, color: '#cbd5e1' }}>{runtimeIssue}</p>
          <p style={{ lineHeight: 1.65, color: '#94a3b8' }}>No wallet or contract operation was attempted. Restore this repository's own Preview deployment record, then reload.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '12px 18px', border: 0, borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Retry configuration</button>
        </section>
      </main>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
        <div>
          <span style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '20px', background: 'rgba(245, 130, 48, 0.15)', color: '#ff9f43', border: '1px solid rgba(245, 130, 48, 0.3)', fontWeight: 600 }}>Project 7</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '6px' }}>Board Election Ballot</h1>
        </div>
        <div>
          {walletConnected ? (
            <div style={{ background: 'rgba(245, 130, 48, 0.08)', border: '1px solid rgba(245, 130, 48, 0.25)', borderRadius: '12px', padding: '8px 16px' }}>
              Balance: <strong style={{ color: '#f58220' }}>{walletBalance} tNIGHT</strong>
            </div>
          ) : (
            <button onClick={connectLace} style={{ width: 'auto' }}>Connect Lace Wallet</button>
          )}
        </div>
      </header>

<section className="home-dashboard" aria-labelledby="home-dashboard-title">
        <div className="home-dashboard__lead">
          <span className="home-kicker">Boardroom console</span>
          <h2 id="home-dashboard-title">Election control</h2>
          <p>Cast a board decision without exposing your share balance.</p>
          <div className="home-actions">
            <button type="button" onClick={() => setActiveTab('dashboard')}>Open Workspace</button>
            <button type="button" className="home-secondary" onClick={() => setActiveTab('privacy')}>Read Privacy Model</button>
          </div>
        </div>
        <div className="home-dashboard__grid">
          <article className="home-card"><span>Network</span><strong>Midnight Preview</strong><small>{contractDeployed ? 'Contract verified' : 'Contract setup pending'}</small></article>
          <article className="home-card"><span>Current signal</span><strong>Shareholder ballot live</strong><small>Weighted vote protected</small></article>
          <article className="home-card"><span>Wallet session</span><strong>{walletConnected ? 'Connected' : 'Not connected'}</strong><small>{walletConnected ? walletBalance + ' tNIGHT available' : 'Connect 1AM to continue'}</small></article>
          <article className="home-card"><span>Contract address</span><strong className="home-address">{contractAddress ? contractAddress.slice(0, 14) + '…' : 'Awaiting deployment'}</strong><small>Unique project deployment</small></article>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'dashboard' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🗳️ Cast Board Vote</button>
        <button onClick={() => setActiveTab('deployer')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'deployer' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'deployer' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🏢 Election Deployer</button>
        <button onClick={() => setActiveTab('walletHub')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'walletHub' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'walletHub' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🔑 Director Wallet</button>
        <button onClick={() => setActiveTab('privacy')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'privacy' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'privacy' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🔒 Ballot Privacy Model</button>
      </div>

      <main style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {(!walletConnected || !contractDeployed) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#f87171' }}>⚠️ Setup Required</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                  {!walletConnected ? "Please connect your Lace Wallet in the Wallet Hub." : "Please deploy the Compact contract in the ZK Deployer."}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', opacity: (walletConnected && contractDeployed) ? 1 : 0.4, pointerEvents: (walletConnected && contractDeployed) ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9f43' }}><Database className="w-5 h-5" /> Voting Ledger</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RESOLVING ID</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{ledger.resolution_id}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL BALLOTS SUBMITTED</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{ledger.total_board_votes} members</div>
                    </div>
                  </div>
                </section>
              </div>

              <div>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#ff9f43', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Play className="w-5 h-5" /> Vote Ballot
                  </h2>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select Candidate Choice</label>
                    <select value={formValues.candidate_choice} onChange={e => setFormValues({ ...formValues, candidate_choice: e.target.value })}>
                      <option value="ALICE">ALICE (Incumbent Board President)</option>
                      <option value="BOB">BOB (Advisory Director)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Shareholder Seed Key</label>
                    <input type="password" value={formValues.shareholder_sk} onChange={e => setFormValues({ ...formValues, shareholder_sk: e.target.value })} />
                  </div>
                  <button onClick={voteBoard} disabled={isProving}>
                    {isProving ? "Constructing Ballot proof..." : "Cast Private Board Vote"}
                  </button>

                  {isProving && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245,130,48,0.05)', border: '1px dashed #f58220', borderRadius: '8px', fontSize: '0.8rem' }}>
                      {proofSteps.map((step, idx) => (
                        <div key={idx} style={{ padding: '3px 0', color: idx === provingStep ? 'white' : 'var(--text-secondary)', opacity: idx <= provingStep ? 1 : 0.4 }}>
                          {idx < provingStep ? '✓' : '●'} {step}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployer' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ff9f43' }}>
              <Cpu className="w-6 h-6" /> Board Voting Deployer
            </h2>
            {contractDeployed ? (
              <p style={{ color: '#10b981' }}>Deployed Preview Address: {contractAddress}</p>
            ) : (
              <button onClick={deployContractAction} disabled={isDeploying || !walletConnected}>
                {isDeploying ? "Deploying..." : "Compile & Deploy Contract"}
              </button>
            )}

            {isDeploying && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245, 130, 48, 0.05)', border: '1px dashed #f58220', borderRadius: '8px', fontSize: '0.8rem' }}>
                {deploySteps.map((step, idx) => (
                  <div key={idx} style={{ padding: '3px 0', color: idx === deployStep ? 'white' : 'var(--text-secondary)', opacity: idx <= deployStep ? 1 : 0.4 }}>
                    {idx < deployStep ? '✓' : '●'} {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'walletHub' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ff9f43' }}>
              <Wallet className="w-6 h-6" /> Wallet Hub & Actions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Lace Account</h3>
                {walletConnected ? (
                  <div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.85rem', marginBottom: '10px' }}>{walletAddress}</div>
                    <button onClick={disconnectLace} style={{ width: 'auto', background: '#dc2626' }}>Disconnect</button>
                  </div>
                ) : (
                  <button onClick={connectLace} style={{ width: 'auto' }}>Connect Wallet</button>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Get tNIGHT</h3>
                <button onClick={requestFaucet} disabled={!walletConnected || faucetLoading}>
                  {faucetLoading ? "Requesting..." : "Mint Faucet Tokens"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ff9f43' }}>
              <Lock className="w-6 h-6" /> Zero-Knowledge Privacy Model
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#10b981' }}>Can Learn:</h3>
                <ul>
                  <li>Corporate voting registry logic code.</li>
                  <li>Aggregate candidate counts.</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#f87171' }}>Cannot Learn:</h3>
                <ul>
                  <li>Which board member voted for Alice or Bob.</li>
                  <li>Shareholder credential keys.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
