import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { useState, useEffect } from "react";
import { abi } from "../utils/contractUtils";
// Removed unused import: parseEther

// Définition des types pour les structures du contrat
export type WorkflowStatus = 0 | 1 | 2 | 3 | 4 | 5;

export type Voter = {
  isRegistered: boolean;
  hasVoted: boolean;
  delegate: string;
  votedProposalId: number;
  weight: number;
};

export type Proposal = {
  description: string;
  voteCount: number;
};

export type WinningProposal = {
  proposalId: number;
  description: string;
  voteCount: number;
};

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Le hook principal pour interagir avec le contrat
export const useVotingContract = () => {
  // Moved publicClient inside the hook
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [currentStatus, setCurrentStatus] = useState<WorkflowStatus>(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isVoter, setIsVoter] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [winningProposal, setWinningProposal] =
    useState<WinningProposal | null>(null);

  // Lecture du statut du workflow
  const { data: workflowStatus } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi,
    functionName: "workflowStatus",
  });

  // Lecture du propriétaire du contrat
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi,
    functionName: "owner",
  });

  // Lecture des infos du votant
  const { data: voterInfo } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi,
    functionName: "voters",
    args: [address],
  });

  // Lecture du nombre de propositions
  const { data: proposalsCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi,
    functionName: "getProposalsCount",
  });

  // Configuration pour écrire dans le contrat
  const { data: hash, writeContract } = useWriteContract();

  // Attente de la transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Mise à jour du statut du workflow
  useEffect(() => {
    if (workflowStatus !== undefined) {
      setCurrentStatus(Number(workflowStatus) as WorkflowStatus);
    }
  }, [workflowStatus]);

  // Vérification si l'utilisateur est le propriétaire
  useEffect(() => {
    if (owner && address) {
      setIsOwner((owner as string).toLowerCase() === address.toLowerCase());
    }
  }, [owner, address]);

  // Vérification si l'utilisateur est un votant enregistré
  useEffect(() => {
    console.log("Raw voter info:", voterInfo);

    if (voterInfo) {
      // Handle array format (which is likely what's happening)
      if (Array.isArray(voterInfo)) {
        const [isRegistered, hasVoted, delegate, votedProposalId, weight] =
          voterInfo;
        setIsVoter(isRegistered);
        console.log("Voter status from array:", isRegistered);
      }
      // Handle object format (what your current code expects)
      else if (typeof voterInfo === "object" && "isRegistered" in voterInfo) {
        setIsVoter((voterInfo as Voter).isRegistered);
        console.log(
          "Voter status from object:",
          (voterInfo as Voter).isRegistered
        );
      }
      // Add fallback if none of the above work
      else {
        console.log("Unexpected voter info format:", voterInfo);
        setIsVoter(false);
      }
    } else {
      console.log("No voter info available");
    }
  }, [voterInfo]);
  // Fonction pour récupérer une proposition par son ID
  const getProposal = async (id: number): Promise<Proposal> => {
    try {
      console.log(`Fetching proposal ${id} from contract`);
      if (!publicClient) {
        return { description: "Client not ready", voteCount: 0 };
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        functionName: "proposals",
        args: [BigInt(id)],
      });

      console.log(`Proposal data:`, result);
      // Properly type the result
      const typedResult = result as [string, bigint];

      return {
        description: typedResult[0],
        voteCount: Number(typedResult[1]),
      };
    } catch (error) {
      console.error(`Error fetching proposal ${id} from contract:`, error);
      return { description: `Error loading proposal ${id}`, voteCount: 0 };
    }
  };

  // Chargement des propositions
  useEffect(() => {
    const loadProposals = async () => {
      if (proposalsCount && Number(proposalsCount) > 0 && publicClient) {
        const proposalPromises = Array.from(
          { length: Number(proposalsCount) },
          (_, i) => getProposal(i)
        );
        const loadedProposals = await Promise.all(proposalPromises);
        setProposals(loadedProposals);
      }
    };

    loadProposals();
  }, [proposalsCount, currentStatus, publicClient]);

  // Chargement de la proposition gagnante si les votes sont comptabilisés
  useEffect(() => {
    const loadWinningProposal = async () => {
      if (currentStatus === 5 && publicClient && proposals.length > 0) {
        try {
          const winningProposalData = await getWinningProposal();
          setWinningProposal(winningProposalData);
        } catch (error) {
          console.error("Error loading winning proposal:", error);
          // Set default winning proposal when there's an error
          setWinningProposal({
            proposalId: 0,
            description: "No winning proposal available",
            voteCount: 0,
          });
        }
      }
    };

    loadWinningProposal();
  }, [currentStatus, publicClient, proposals.length]);

  // Fonction pour récupérer la proposition gagnante
  const getWinningProposal = async (): Promise<WinningProposal> => {
    try {
      console.log("Fetching winning proposal from contract");
      if (!publicClient) {
        return {
          proposalId: 0,
          description: "Client not ready",
          voteCount: 0,
        };
      }

      // Check if there are any proposals first
      if (proposals.length === 0) {
        return {
          proposalId: 0,
          description: "No proposals available",
          voteCount: 0,
        };
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        functionName: "getWinningProposal",
      });

      console.log("Winning proposal data:", result);
      // Properly type the result
      const typedResult = result as [bigint, string, bigint];

      return {
        proposalId: Number(typedResult[0]),
        description: typedResult[1],
        voteCount: Number(typedResult[2]),
      };
    } catch (error) {
      console.error("Error fetching winning proposal from contract:", error);

      // Find the proposal with the highest vote count manually as fallback
      if (proposals.length > 0) {
        let maxVotes = 0;
        let winningIndex = 0;

        proposals.forEach((proposal, index) => {
          if (proposal.voteCount > maxVotes) {
            maxVotes = proposal.voteCount;
            winningIndex = index;
          }
        });

        return {
          proposalId: winningIndex,
          description: proposals[winningIndex].description,
          voteCount: proposals[winningIndex].voteCount,
        };
      }

      return {
        proposalId: 0,
        description: "Error loading winner",
        voteCount: 0,
      };
    }
  };

  // Fonctions pour interagir avec le contrat
  const registerVoter = (voterAddress: string) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "registerVoter",
      args: [voterAddress],
    });
  };

  const startProposalsRegistration = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "startProposalsRegistration",
    });
  };

  const endProposalsRegistration = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "endProposalsRegistration",
    });
  };

  const startVotingSession = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "startVotingSession",
    });
  };

  const endVotingSession = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "endVotingSession",
    });
  };

  const tallyVotes = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "tallyVotes",
    });
  };

  const addProposal = (description: string) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "addProposal",
      args: [description],
    });
  };

  const vote = (proposalId: number) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "vote",
      args: [proposalId],
    });
  };

  const delegate = (delegateAddress: string) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "delegate",
      args: [delegateAddress],
    });
  };

  return {
    address,
    currentStatus,
    isOwner,
    isVoter,
    proposals,
    winningProposal,
    isConfirming,
    isConfirmed,
    registerVoter,
    startProposalsRegistration,
    endProposalsRegistration,
    startVotingSession,
    endVotingSession,
    tallyVotes,
    addProposal,
    vote,
    delegate,
  };
};
