import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { useState, useEffect } from "react";
import { abi } from "../utils/contractUtils";
import { useNotification } from "../components/NotificationContext";
import { parseAbiItem } from "viem";

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
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { showNotification } = useNotification();
  const [currentStatus, setCurrentStatus] = useState<WorkflowStatus>(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isVoter, setIsVoter] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [delegated, setDelegated] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [winningProposal, setWinningProposal] =
    useState<WinningProposal | null>(null);

  const [isReloading, setIsReloading] = useState(false);

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
  const { data: hash, writeContract, status, error } = useWriteContract();

  // Attente de la transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Fonction pour recharger les données du contrat
  const reloadContractData = async () => {
    setIsReloading(true);

    try {
      // Recharger le statut du workflow
      if (publicClient) {
        const newStatus = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi,
          functionName: "workflowStatus",
        });
        setCurrentStatus(Number(newStatus) as WorkflowStatus);

        // Recharger les informations du votant
        if (address) {
          const voterData = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: "voters",
            args: [address],
          });

          if (Array.isArray(voterData)) {
            const [
              isRegistered,
              hasVotedValue,
              delegateValue,
              votedProposalId,
              weight,
            ] = voterData;
            setIsVoter(isRegistered);
            setHasVoted(hasVotedValue);
            setDelegated(
              delegateValue !== "0x0000000000000000000000000000000000000000"
                ? delegateValue
                : null
            );
          }
        }

        // Recharger le nombre de propositions
        const newProposalsCount = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi,
          functionName: "getProposalsCount",
        });

        // Recharger les propositions
        if (newProposalsCount && Number(newProposalsCount) > 0) {
          const proposalPromises = Array.from(
            { length: Number(newProposalsCount) },
            (_, i) => getProposal(i)
          );
          const refreshedProposals = await Promise.all(proposalPromises);
          setProposals(refreshedProposals);
        }

        // Si les votes sont comptabilisés, recharger le gagnant
        if (Number(newStatus) === 5) {
          try {
            const refreshedWinner = await getWinningProposal();
            setWinningProposal(refreshedWinner);
          } catch (error) {
            console.error("Erreur lors du rechargement du gagnant:", error);
          }
        }
      }
    } catch (error) {
      console.error("Erreur pendant le rechargement des données:", error);
    } finally {
      // Délai pour une meilleure expérience utilisateur
      setTimeout(() => {
        setIsReloading(false);
      }, 1500);
    }
  };

  // Configuration des écouteurs d'événements du contrat
  const setupContractEventListeners = () => {
    if (!publicClient || !CONTRACT_ADDRESS) return () => {};

    try {
      // Écouter l'événement WorkflowStatusChange
      const unwatchStatus = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        eventName: "WorkflowStatusChange",
        onLogs: (logs) => {
          console.log("WorkflowStatusChange event detected:", logs);
          if (logs.length > 0 && logs[0].args) {
            const newStatus = logs[0].args.newStatus;
            if (newStatus !== undefined) {
              setCurrentStatus(Number(newStatus) as WorkflowStatus);
              reloadContractData();
            }
          }
        },
      });

      // Écouter l'événement Voted
      const unwatchVoted = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        eventName: "Voted",
        onLogs: (logs) => {
          console.log("Voted event detected:", logs);
          reloadContractData();
        },
      });

      // Écouter l'événement ProposalRegistered
      const unwatchProposal = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        eventName: "ProposalRegistered",
        onLogs: (logs) => {
          console.log("ProposalRegistered event detected:", logs);
          reloadContractData();
        },
      });

      // Écouter l'événement VoterRegistered
      const unwatchVoter = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        eventName: "VoterRegistered",
        onLogs: (logs) => {
          console.log("VoterRegistered event detected:", logs);
          // Si l'événement concerne l'utilisateur actuel
          if (
            logs.length > 0 &&
            logs[0].args &&
            logs[0].args.voterAddress === address
          ) {
            reloadContractData();
          }
        },
      });

      // Écouter l'événement VoterDelegated
      const unwatchDelegate = publicClient.watchContractEvent({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        eventName: "VoterDelegated",
        onLogs: (logs) => {
          console.log("VoterDelegated event detected:", logs);
          reloadContractData();
        },
      });

      // Nettoyer les écouteurs lors du démontage du composant
      return () => {
        unwatchStatus();
        unwatchVoted();
        unwatchProposal();
        unwatchVoter();
        unwatchDelegate();
      };
    } catch (error) {
      console.error("Error setting up event listeners:", error);
      return () => {};
    }
  };

  // Mise en place du polling périodique des données
  useEffect(() => {
    // Ne démarrer le polling que si l'utilisateur est connecté
    if (!address || !publicClient) return;

    // Polling toutes les 15 secondes
    const pollingInterval = setInterval(async () => {
      try {
        const currentWorkflowStatus = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi,
          functionName: "workflowStatus",
        });

        // Si le statut a changé, recharger toutes les données
        if (currentStatus !== Number(currentWorkflowStatus)) {
          console.log("Status change detected via polling");
          reloadContractData();
        }
      } catch (error) {
        console.error("Erreur de polling:", error);
      }
    }, 15000); // 15 secondes

    return () => clearInterval(pollingInterval);
  }, [address, publicClient, currentStatus]);

  // Configurer les écouteurs d'événements lors du chargement initial
  useEffect(() => {
    const cleanup = setupContractEventListeners();
    return cleanup;
  }, [publicClient, CONTRACT_ADDRESS, address]);

  // Gestion des statuts et erreurs de transactions
  useEffect(() => {
    if (status === "success" && hash) {
      showNotification("Transaction soumise avec succès", "success", hash);
    } else if (status === "error" && error) {
      showNotification(`Erreur: ${error.message}`, "error");
    }
  }, [status, hash, error, showNotification]);

  // Notification lors de la confirmation de transaction
  useEffect(() => {
    if (isConfirmed && hash) {
      showNotification("Transaction confirmée!", "success", hash);
      reloadContractData();
    }
  }, [isConfirmed, hash, showNotification]);

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

  // Vérification si l'utilisateur est un votant enregistré et s'il a déjà voté
  useEffect(() => {
    if (voterInfo) {
      if (Array.isArray(voterInfo)) {
        const [
          isRegistered,
          hasVotedValue,
          delegateValue,
          votedProposalId,
          weight,
        ] = voterInfo;
        setIsVoter(isRegistered);
        setHasVoted(hasVotedValue);
        setDelegated(
          delegateValue !== "0x0000000000000000000000000000000000000000"
            ? delegateValue
            : null
        );
      } else if (typeof voterInfo === "object" && "isRegistered" in voterInfo) {
        const voter = voterInfo as Voter;
        setIsVoter(voter.isRegistered);
        setHasVoted(voter.hasVoted);
        setDelegated(
          voter.delegate !== "0x0000000000000000000000000000000000000000"
            ? voter.delegate
            : null
        );
      } else {
        setIsVoter(false);
        setHasVoted(false);
        setDelegated(null);
      }
    } else {
      setIsVoter(false);
      setHasVoted(false);
      setDelegated(null);
    }
  }, [voterInfo]);

  // Fonction pour récupérer une proposition par son ID
  const getProposal = async (id: number): Promise<Proposal> => {
    try {
      if (!publicClient) {
        return { description: "Client not ready", voteCount: 0 };
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi,
        functionName: "proposals",
        args: [BigInt(id)],
      });

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
      if (!publicClient) {
        return {
          proposalId: 0,
          description: "Client not ready",
          voteCount: 0,
        };
      }

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

  const buyWeight = (amount: number) => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "buyWeight",
      value: BigInt(amount),
    });
  };

  const withdrawFunds = () => {
    if (!address) return;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi,
      functionName: "withdrawFunds",
    });
  };

  // Retourne toutes les fonctionnalités et données du hook
  return {
    address,
    currentStatus,
    isOwner,
    isVoter,
    hasVoted,
    delegated,
    proposals,
    winningProposal,
    isConfirming,
    isConfirmed,
    isReloading,
    registerVoter,
    startProposalsRegistration,
    endProposalsRegistration,
    startVotingSession,
    endVotingSession,
    tallyVotes,
    addProposal,
    vote,
    delegate,
    buyWeight,
    withdrawFunds,
    reloadContractData, // Export this function to allow manual refresh from components
  };
};
