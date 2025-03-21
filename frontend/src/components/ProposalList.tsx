import React from "react";
import { useVotingContract, Proposal } from "../hooks/useVotingContract";
import Loader from "./Loader";

const ProposalList: React.FC = () => {
  const {
    currentStatus,
    isVoter,
    hasVoted,
    delegated,
    proposals,
    vote,
    isConfirming,
    isReloading,
  } = useVotingContract();

  // Si aucune proposition n'est disponible
  if (proposals.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Propositions</h2>
        <p>Aucune proposition n'a été soumise pour le moment.</p>
      </div>
    );
  }

  // Fonction pour gérer le vote
  const handleVote = (proposalId: number) => {
    vote(proposalId);
  };

  // Détermine si on affiche les compteurs de votes
  const showVoteCounts = currentStatus >= 4; // Montrer les votes après la fin de la session

  // Déterminer si l'utilisateur peut voter
  const canVote = isVoter && currentStatus === 3 && !hasVoted && !delegated;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Propositions</h2>

      {(isConfirming || isReloading) && (
        <div className="mb-4">
          <Loader
            message={
              isConfirming
                ? "Transaction en cours..."
                : "Mise à jour des données..."
            }
            isReloading={isReloading}
          />
        </div>
      )}

      <div className="space-y-4">
        {proposals.map((proposal: Proposal, index: number) => (
          <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{proposal.description}</h3>
              {showVoteCounts && (
                <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm">
                  {proposal.voteCount} votes
                </span>
              )}
            </div>

            {canVote && (
              <button
                onClick={() => handleVote(index)}
                disabled={isConfirming}
                className="mt-2 bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {isConfirming ? "En cours..." : "Voter"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProposalList;
