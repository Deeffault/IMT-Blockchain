import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { VotingABI } from "../contracts/VotingABI";
import styles from "../styles/Home.module.css";

// Contract address - replace with your deployed contract address
const CONTRACT_ADDRESS = "0x..." as `0x${string}`;

// Workflow status enum mapping
const WorkflowStatus = {
  RegisteringVoters: 0,
  ProposalsRegistrationStarted: 1,
  ProposalsRegistrationEnded: 2,
  VotingSessionStarted: 3,
  VotingSessionEnded: 4,
  VotesTallied: 5,
};

const WorkflowStatusLabels = [
  "Registering Voters",
  "Proposals Registration Started",
  "Proposals Registration Ended",
  "Voting Session Started",
  "Voting Session Ended",
  "Votes Tallied",
];

// Define a type for the winning proposal
type WinningProposal = {
  proposalId: bigint;
  description: string;
  voteCount: bigint;
};

const VotingPage = () => {
  const { address, isConnected } = useAccount();
  const [voterAddress, setVoterAddress] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalId, setProposalId] = useState<number>(0);
  const [proposals, setProposals] = useState<
    { id: number; description: string; voteCount: number }[]
  >([]);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Read contract state
  const { data: currentStatus } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VotingABI,
    functionName: "workflowStatus",
  });

  const { data: contractOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VotingABI,
    functionName: "owner",
  });

  const { data: voterData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VotingABI,
    functionName: "voters",
    args: address ? [address] : undefined,
  });

  const { data: proposalCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VotingABI,
    functionName: "getProposalsCount",
  });

  const { data: winningProposal } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VotingABI,
    functionName: "getWinningProposal",
    query: {
      enabled: Number(currentStatus) === WorkflowStatus.VotesTallied,
    },
  }) as { data: WinningProposal | undefined };

  // Contract write functions
  const { writeContract } = useWriteContract();

  // Wait for transaction
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (txSuccess) {
      setVoterAddress("");
      setProposalDescription("");
      fetchProposals();
    }
  }, [txSuccess]);

  // Helper functions
  const isOwner =
    typeof address === "string" &&
    typeof contractOwner === "string" &&
    address.toLowerCase() === contractOwner.toLowerCase();

  const isRegisteredVoter = Boolean(
    voterData &&
      typeof voterData === "object" &&
      voterData !== null &&
      "isRegistered" in voterData &&
      voterData.isRegistered
  );

  // Handle contract write functions
  const handleRegisterVoter = () => {
    if (voterAddress) {
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: VotingABI,
          functionName: "registerVoter",
          args: [voterAddress as `0x${string}`],
        },
        {
          onSuccess: (hash) => setTxHash(hash),
        }
      );
    }
  };

  const handleStartProposalsRegistration = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: VotingABI,
        functionName: "startProposalsRegistration",
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  };

  const handleEndProposalsRegistration = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: VotingABI,
        functionName: "endProposalsRegistration",
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  };

  const handleStartVotingSession = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: VotingABI,
        functionName: "startVotingSession",
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  };

  const handleEndVotingSession = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: VotingABI,
        functionName: "endVotingSession",
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  };

  const handleTallyVotes = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: VotingABI,
        functionName: "tallyVotes",
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  };

  const handleAddProposal = () => {
    if (proposalDescription) {
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: VotingABI,
          functionName: "addProposal",
          args: [proposalDescription],
        },
        {
          onSuccess: (hash) => setTxHash(hash),
        }
      );
    }
  };

  const handleVote = () => {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: VotingABI,
        functionName: "vote",
        args: [BigInt(proposalId)],
      },
      {
        onSuccess: (hash) => setTxHash(hash),
      }
    );
  };

  // Fetch all proposals
  const fetchProposals = async () => {
    if (!proposalCount || Number(proposalCount) === 0) return;

    const proposalsList = [];
    for (let i = 0; i < Number(proposalCount); i++) {
      try {
        const proposal = await fetch(`/api/getProposal?id=${i}`);
        const { description, voteCount } = await proposal.json();
        proposalsList.push({
          id: i,
          description,
          voteCount: Number(voteCount),
        });
      } catch (error) {
        console.error("Error fetching proposal", error);
      }
    }
    setProposals(proposalsList);
  };

  useEffect(() => {
    if (isConnected && proposalCount && Number(proposalCount) > 0) {
      fetchProposals();
    }
  }, [isConnected, proposalCount]);

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Voting DApp</h1>
          <p>Please connect your wallet to participate</p>
          <ConnectButton />
        </main>
      </div>
    );
  }

  // Check if user is in proposal registration phase
  const isProposalRegistration =
    isRegisteredVoter &&
    Number(currentStatus) === WorkflowStatus.ProposalsRegistrationStarted;

  // Check if user is in voting phase
  const isVotingPhase =
    isRegisteredVoter &&
    Number(currentStatus) === WorkflowStatus.VotingSessionStarted;

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <ConnectButton />

        <h1 className={styles.title}>Voting DApp</h1>

        <div className={styles.card}>
          <h2>Current Status: {WorkflowStatusLabels[Number(currentStatus)]}</h2>
          {isOwner && <p>You are the admin</p>}
          {isRegisteredVoter && <p>You are a registered voter</p>}
        </div>

        {/* Admin Panel */}
        {isOwner && (
          <div className={styles.card}>
            <h2>Admin Panel</h2>

            {Number(currentStatus) === WorkflowStatus.RegisteringVoters && (
              <>
                <div>
                  <h3>Register Voter</h3>
                  <input
                    type="text"
                    placeholder="Voter Address"
                    value={voterAddress}
                    onChange={(e) => setVoterAddress(e.target.value)}
                  />
                  <button onClick={handleRegisterVoter}>Register Voter</button>
                </div>
                <button onClick={handleStartProposalsRegistration}>
                  Start Proposals Registration
                </button>
              </>
            )}

            {Number(currentStatus) ===
              WorkflowStatus.ProposalsRegistrationStarted && (
              <button onClick={handleEndProposalsRegistration}>
                End Proposals Registration
              </button>
            )}

            {Number(currentStatus) ===
              WorkflowStatus.ProposalsRegistrationEnded && (
              <button onClick={handleStartVotingSession}>
                Start Voting Session
              </button>
            )}

            {Number(currentStatus) === WorkflowStatus.VotingSessionStarted && (
              <button onClick={handleEndVotingSession}>
                End Voting Session
              </button>
            )}

            {Number(currentStatus) === WorkflowStatus.VotingSessionEnded && (
              <button onClick={handleTallyVotes}>Tally Votes</button>
            )}
          </div>
        )}

        {/* Voter Proposal Registration */}
        {isProposalRegistration && (
          <div className={styles.card}>
            <h2>Submit Proposal</h2>
            <input
              type="text"
              placeholder="Proposal Description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
            />
            <button onClick={handleAddProposal}>Submit Proposal</button>
          </div>
        )}

        {/* Voter Voting */}
        {isVotingPhase && (
          <div className={styles.card}>
            <h2>Vote for a Proposal</h2>
            <select
              value={proposalId}
              onChange={(e) => setProposalId(Number(e.target.value))}
            >
              {proposals.map((proposal) => (
                <option key={proposal.id} value={proposal.id}>
                  {proposal.description}
                </option>
              ))}
            </select>
            <button onClick={handleVote}>Vote</button>
          </div>
        )}

        {/* Proposals List */}
        {proposals.length > 0 && (
          <div className={styles.card}>
            <h2>Proposals</h2>
            <ul>
              {proposals.map((proposal) => (
                <li key={proposal.id}>
                  {proposal.description} - Votes: {proposal.voteCount}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Results */}
        {Number(currentStatus) === WorkflowStatus.VotesTallied &&
          winningProposal && (
            <div className={styles.card}>
              <h2>Voting Results</h2>
              <h3>Winning Proposal</h3>
              <p>
                ID:{" "}
                {winningProposal &&
                typeof winningProposal === "object" &&
                "proposalId" in winningProposal
                  ? Number(winningProposal.proposalId)
                  : "N/A"}
              </p>
              <p>
                Description:{" "}
                {winningProposal &&
                typeof winningProposal === "object" &&
                "description" in winningProposal
                  ? winningProposal.description
                  : "N/A"}
              </p>
              <p>
                Vote Count:{" "}
                {winningProposal &&
                typeof winningProposal === "object" &&
                "voteCount" in winningProposal
                  ? Number(winningProposal.voteCount)
                  : "N/A"}
              </p>
            </div>
          )}
      </main>
    </div>
  );
};

export default VotingPage;
