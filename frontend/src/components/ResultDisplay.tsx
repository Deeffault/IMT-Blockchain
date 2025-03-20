import React from "react";
import { useVotingContract } from "../hooks/useVotingContract";

const ResultDisplay: React.FC = () => {
  const { currentStatus, winningProposal } = useVotingContract();

  // Ne pas afficher si les votes n'ont pas été comptabilisés
  if (currentStatus !== 5 || !winningProposal) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold mb-4">Résultats du vote</h2>
      <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50">
        <h3 className="text-xl font-semibold mb-2">Proposition gagnante:</h3>
        <p className="text-lg mb-2">{winningProposal.description}</p>
        <p className="text-md">
          <span className="font-semibold">Nombre de votes:</span>{" "}
          {winningProposal.voteCount}
        </p>
        <p className="text-md">
          <span className="font-semibold">ID de la proposition:</span>{" "}
          {winningProposal.proposalId}
        </p>
      </div>
    </div>
  );
};

export default ResultDisplay;
