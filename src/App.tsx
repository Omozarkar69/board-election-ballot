import OperatorSetup from './OperatorSetup';
import { useState, useEffect } from "react";
import {
  deployBoardvotingContract,
  boardSecret,
  readBoardLedger,
  submitBoardvotingCircuit,
} from "./midnightClient";
import {
  verifyBoardElectionDeployment,
  validateBoardElectionDeploymentRuntime,
} from "./runtimeConfig";

const RUNTIME = validateBoardElectionDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const [activeTab, setActiveTab] = useState(() =>
    ["dashboard", "walletHub", "deployer", "privacy"].includes(
      window.location.hash.slice(2),
    )
      ? window.location.hash.slice(2)
      : "home",
  );
  useEffect(() => {
    const navigate = () => {
      if (["#content", "#main-content"].includes(window.location.hash)) return;
      const route = window.location.hash.slice(2);
      setActiveTab(
        ["dashboard", "walletHub", "deployer", "privacy"].includes(route)
          ? route
          : "home",
      );
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
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

  const [ledger, setLedger] = useState<{ candidate_alice: number; candidate_bob: number; total_board_votes: number; resolution_id: string } | null>(null);
  const [formValues, setFormValues] = useState({
    candidate_choice: "ALICE",
    shareholder_sk: "0808080808080808080808080808080808080808080808080808080808080808",
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Verifying shareholder voting allocation balance...",
    "Computing board nullifier key to prevent double voting...",
    "Hashing shielded candidate choice parameter...",
    "Broadcasting board ballot proof...",
  ];

  const deploySteps = [
    "Setting up corporate board candidates list...",
    "Initializing quorum state variables...",
    "Deploying board_voting.compact on-chain...",
  ];

  useEffect(() => {
    fetch("/deployment.json")
      .then((response) => {
        if (!response.ok)
          throw new Error(
            "Board Election Ballot: deployment.json could not be loaded.",
          );
        return response.json();
      })
      .then((deployment) => {
        const verified = verifyBoardElectionDeployment(deployment);
        if (
          RUNTIME.contractAddress &&
          RUNTIME.contractAddress !== verified.contractAddress
        ) {
          throw new Error(
            "Board Election Ballot: environment address does not match deployment evidence.",
          );
        }
        if (verified.network === RUNTIME.networkId) {
          setContractAddress(verified.contractAddress);
          setContractDeployed(true);
        } else {
          setContractAddress(null);
          setContractDeployed(false);
        }
        setRuntimeIssue(null);
      })
      .catch((error) => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(
          error instanceof Error
            ? error.message
            : "Board Election Ballot: configuration failed.",
        );
      });
    const detectLace = () => {
      const hasMidnightWallet = Object.values(
        (window as any).midnight ?? {},
      ).some((candidate: any) => typeof candidate?.connect === "function");
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectLace = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values(
        (window as any).midnight ?? {},
      ) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
        rdns?: string;
      }>;
      const oneAm = candidates.find(
        (c) =>
          /1am/i.test(`${c.name ?? ""} ${c.rdns ?? ""}`) &&
          typeof c.connect === "function",
      );
      const wallet =
        oneAm ??
        candidates.find((candidate) => typeof candidate.connect === "function");
      if (!wallet?.connect) {
        throw new Error(
          "No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.",
        );
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
      logTransaction(
        "wallet",
        "MIDNIGHT WALLET CONNECTED",
        "—",
        "Connected through the Midnight DApp Connector API",
      );
    } catch (err) {
      console.error("Midnight wallet connection failed:", err);
      const raw = err instanceof Error ? err.message : String(err || "");
      const msg = (raw.includes("tabs:outgoing.message.ready") || raw.includes("No Listener")) ? "Wallet extension is asleep or locked. Please open and unlock your 1AM / Lace wallet extension, then retry." : (raw || "Midnight wallet connection failed.");
      alert(msg);
    } finally {
      setConnectingWallet(false);
    }
  };

  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction(
      "0x0000...0000",
      "1AM WALLET DISCONNECTED",
      "0.00 tNIGHT",
      "Disconnected wallet context",
    );
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, "_blank", "noopener,noreferrer");
    logTransaction(
      "—",
      "FAUCET OPENED",
      "—",
      "Funding must be confirmed by the official Midnight Preview faucet and wallet balance refresh.",
    );
  };

  const deployContractAction = async () => {
    if (!connectedWallet) {
      alert("Connect a Midnight wallet before deploying.");
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployBoardvotingContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      setRuntimeIssue(null);
      logTransaction(
        result.txId,
        "CONFIRMED ON MIDNIGHT",
        "—",
        `Fresh ${RUNTIME.networkId} deployment ${result.contractAddress}`,
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Contract deployment failed.",
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const voteBoard = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    try {
      const result = await submitBoardvotingCircuit(
        (window as any).__midnightConnectedWallet,
        contractAddress,
        "castVote",
        [BigInt(formValues.candidate_choice === "ALICE" ? 0 : 1)],
        { secretKey: boardSecret(formValues.shareholder_sk) },
      );
      const chain = await readBoardLedger(
        (window as any).__midnightConnectedWallet,
        contractAddress,
      );
      setLedger({
        candidate_alice: chain.aliceVotes,
        candidate_bob: chain.bobVotes,
        total_board_votes: chain.voterCount,
        resolution_id: chain.electionId.slice(0, 18) + "…",
      });
      logTransaction(
        result.txId,
        "CONFIRMED ON MIDNIGHT",
        "—",
        "Confirmed castVote on " + contractAddress,
      );
      return;
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "The Midnight transaction failed.",
      );
      logTransaction(
        "—",
        "TRANSACTION FAILED",
        "—",
        err instanceof Error ? err.message : "Unknown transaction failure",
      );
      return;
    }
  };

  const logTransaction = (
    hash: string,
    status: string,
    fee: string,
    details: string,
  ) => {
    setLogs((prev) => [
      {
        hash,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        status,
        fee,
        details,
      },
      ...prev,
    ]);
  };

  const submitWithStatus = async (action: () => Promise<void>) => {
    if (isProving) return;
    setIsProving(true);
    try {
      await action();
    } finally {
      setIsProving(false);
    }
  };
  const ready = walletConnected && contractDeployed && !runtimeIssue;
  const pages = [
    ["dashboard", "Open ballot"],
    ["walletHub", "Wallet"],
    ["deployer", "Contract"],
    ["privacy", "Privacy"],
  ];
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="masthead">
        <a className="brand" href="#/">
          Board / Ballot
        </a>
        <nav aria-label="Main navigation">
          <a href="#/" aria-current={activeTab === "home" ? "page" : undefined}>
            About
          </a>
          <a
            href="#/dashboard"
            aria-current={activeTab !== "home" ? "page" : undefined}
          >
            Workspace ↗
          </a>
        </nav>
      </header>
      {activeTab === "home" ? (
        <main id="main-content" tabIndex={-1} className="landing">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Private board elections</p>
              <h1>
                A clear process.<em>An independent vote.</em>
              </h1>
              <p className="intro">
                A dedicated voting workspace for board participants. Select a
                candidate, provide your voting credential, and review your
                transaction before submitting.
              </p>
              <div className="actions">
                <a className="button" href="#/dashboard">
                  Open ballot ↗
                </a>
                <a href="#/privacy">Understand privacy</a>
              </div>
            </div>
            <aside className="hero-note">
              <span className="note-mark" aria-hidden="true">
                ✓
              </span>
              <h2>Election protocol</h2>
              <p>
                Confirm the election and contract address with your
                administrator before voting. A wallet connection alone does not
                establish eligibility.
              </p>
            </aside>
          </section>
          <section className="process" aria-label="How it works">
            <article>
              <span className="step">01</span>
              <h2>Confirm the election</h2>
              <p>
                Start with the required credentials and a compatible wallet.
              </p>
            </article>
            <article>
              <span className="step">02</span>
              <h2>Select your candidate</h2>
              <p>Review your inputs carefully before sending a transaction.</p>
            </article>
            <article>
              <span className="step">03</span>
              <h2>Approve your ballot</h2>
              <p>Treat an action as complete only after confirmation.</p>
            </article>
          </section>
          <section className="privacy-note">
            <h2>Privacy has boundaries.</h2>
            <p>
              The application uses a private credential for the voting proof.
              Aggregate candidate totals and election data can be public. Do not
              assume this hides transaction timing or wallet metadata, or
              provides secret-ballot guarantees beyond the contract.
            </p>
          </section>
        </main>
      ) : (
        <div className="workspace">
          <nav className="workspace-nav" aria-label="Workspace navigation">
            {pages.map(([route, label]) => (
              <a
                key={route}
                href={"#/" + route}
                aria-current={activeTab === route ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          <main id="main-content" tabIndex={-1} className="workspace-main">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Private board elections</p>
                <h1>{pages.find(([route]) => route === activeTab)?.[1]}</h1>
              </div>
              <span className="network">Midnight {RUNTIME.networkId}</span>
            </div>
            {runtimeIssue ? (
              <section className="notice" role="alert">
                <h2>Configuration needs attention</h2>
                <p>{runtimeIssue}</p>
                <p>
                  Wallet and contract actions are blocked until this
                  repository’s deployment configuration is restored.
                </p>
                <button onClick={() => window.location.reload()}>
                  Retry configuration
                </button>
              </section>
            ) : null}
            {isProving && (
              <div className="notice" role="status">
                Awaiting wallet approval, proof generation, and confirmation.
                Check your wallet; do not submit again.
              </div>
            )}
            {activeTab === "dashboard" && (
              <>
                {!ready && (
                  <div className="notice">
                    <strong>Before you begin</strong>
                    <p>
                      {!walletConnected
                        ? "Connect your wallet to continue."
                        : "A contract must be configured before submitting."}
                    </p>
                    <a href={!walletConnected ? "#/walletHub" : "#/deployer"}>
                      {!walletConnected
                        ? "Go to wallet →"
                        : "Review contract →"}
                    </a>
                  </div>
                )}
                <div className="task-grid">
                  <section className="panel form-panel">
                    <h2>Cast your ballot</h2>
                    <fieldset disabled={!ready || isProving}>
                      <legend className="sr-only">Cast your ballot</legend>
                      <label>
                        Candidate
                        <select
                          value={formValues.candidate_choice}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              candidate_choice: e.target.value,
                            })
                          }
                        >
                          <option value="ALICE">Alice</option>
                          <option value="BOB">Bob</option>
                        </select>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', margin: '14px 0' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Shielded Shareholder Key Active</span>
                      </div>
                      <details style={{ marginBottom: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <summary style={{ cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>Advanced / Custom Key</summary>
                        <label style={{ display: 'block', marginTop: '8px' }}>
                          Shareholder credential key
                          <input
                            type="password"
                            value={formValues.shareholder_sk}
                            onChange={(e) =>
                              setFormValues({
                                ...formValues,
                                shareholder_sk: e.target.value,
                              })
                            }
                          />
                        </label>
                      </details>
                      <button
                        disabled={
                          !walletConnected || !contractDeployed || isProving
                        }
                        onClick={() => void submitWithStatus(voteBoard)}
                      >
                        Submit ballot
                      </button>
                    </fieldset>
                  </section>
                  <aside className="panel context-panel">
                    <h2>Election record</h2>
                    {ledger && logs.some((log) =>
                      log.details.startsWith("Confirmed castVote"),
                    ) ? (
                      <dl>
                        <dt>Election</dt>
                        <dd>{ledger.resolution_id}</dd>
                        <dt>Recorded voters</dt>
                        <dd>{ledger.total_board_votes}</dd>
                        <dt>Alice / Bob</dt>
                        <dd>
                          {ledger.candidate_alice} / {ledger.candidate_bob}
                        </dd>
                      </dl>
                    ) : (
                      <p>
                        Election totals have not been loaded. No sample counts
                        are shown. Confirm the election details with your
                        administrator.
                      </p>
                    )}
                    <hr />
                    <h3>Before approving</h3>
                    <p>
                      Confirm the election and contract address with your
                      administrator before voting. A wallet connection alone
                      does not establish eligibility.
                    </p>
                  </aside>
                </div>
              </>
            )}
            {activeTab === "walletHub" && (
              <div className="task-grid">
                <section className="panel">
                  <h2>Wallet connection</h2>
                  <p>
                    {laceDetected
                      ? "A compatible wallet connector is available."
                      : "Install and unlock a compatible Midnight wallet such as 1AM or Lace."}
                  </p>
                  {walletConnected ? (
                    <>
                      <p className="address">{walletAddress}</p>
                      <p>Reported balance: {walletBalance} tNIGHT</p>
                      <button className="secondary" onClick={disconnectLace}>
                        Disconnect wallet
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={connectingWallet}
                      onClick={connectLace}
                    >
                      {connectingWallet ? "Connecting…" : "Connect wallet"}
                    </button>
                  )}
                </section>
                <section className="panel">
                  <h2>Test-network funding</h2>
                  <p>
                    The faucet opens in a separate tab. Funding is not confirmed
                    by opening the page; check your wallet balance.
                  </p>
                  <button
                    disabled={!walletConnected}
                    onClick={requestFaucet}
                  >
                    Open faucet ↗
                  </button>
                </section>
              </div>
            )}
            {activeTab === 'deployer' && <OperatorSetup wallet={walletConnected ? connectedWallet : null} address={runtimeIssue ? null : contractAddress} />}
            {activeTab === "deployer" && (
              <section className="panel">
                <h2>Contract configuration</h2>
                <p>
                  Confirm this address and network before approving a
                  transaction.
                </p>
                {contractDeployed ? (
                  <p className="address">{contractAddress}</p>
                ) : (
                  <>
                    <p>No matching contract is configured.</p>
                    <button
                      disabled={
                        !walletConnected || isDeploying
                      }
                      onClick={deployContractAction}
                    >
                      {isDeploying ? "Deploying…" : "Deploy contract"}
                    </button>
                  </>
                )}
              </section>
            )}
            {activeTab === "privacy" && (
              <section className="panel privacy-detail">
                <h2>What this application protects</h2>
                <p>
                  The application uses a private credential for the voting
                  proof. Aggregate candidate totals and election data can be
                  public. Do not assume this hides transaction timing or wallet
                  metadata, or provides secret-ballot guarantees beyond the
                  contract.
                </p>
                <h3>Your responsibility</h3>
                <p>
                  Use a dedicated application credential. Never enter your
                  wallet recovery phrase.
                </p>
                <p>
                  Keep credential secrets on a trusted device. Check wallet
                  requests and the configured contract. Do not share secret
                  inputs, screenshots of credentials, or sensitive personal
                  information.
                </p>
                <h3>Confirmation matters</h3>
                <p>
                  A wallet connection or submitted request is not evidence of a
                  successful transaction. Review the session activity and your
                  wallet for confirmation.
                </p>
              </section>
            )}
            {(activeTab === "dashboard" || activeTab === "walletHub") && (
              <section className="activity panel" aria-live="polite">
                <h2>Activity this session</h2>
                {logs.length === 0 ? (
                  <p>
                    No activity yet. Completed actions and errors will appear
                    here.
                  </p>
                ) : (
                  <ol>
                    {logs.map((log, index) => (
                      <li key={index}>
                        <strong>{log.status}</strong>
                        <time>{log.timestamp}</time>
                        <p>{log.details}</p>
                        <code>{log.hash}</code>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
          </main>
        </div>
      )}
      <footer>
        <span>Board / Ballot</span>
        <span>
          Midnight application · Review privacy before using real data.
        </span>
        <a href="#/privacy">Privacy notes</a>
      </footer>
    </div>
  );
}
