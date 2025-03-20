import React, { useState } from "react";
import { useVotingContract } from "../hooks/useVotingContract";
import Loader from "./Loader";

const VoterPanel: React.FC = () => {
  const [proposalDesc, setProposalDesc] = useState("");
  const [delegateAddress, setDelegateAddress] = useState("");
  const [weightAmount, setWeightAmount] = useState<number>(1);
  const {
    currentStatus,
    isVoter,
    hasVoted,
    delegated,
    proposals,
    addProposal,
    delegate,
    vote,
    buyWeight,
    isConfirming,
  } = useVotingContract();

  // Si l'utilisateur n'est pas un votant enregistré, ne pas afficher le panneau
  if (!isVoter) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">Panneau du votant</h2>
        <p>Vous n'êtes pas enregistré comme votant pour cette élection.</p>
      </div>
    );
  }

  const handleAddProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (proposalDesc) {
      addProposal(proposalDesc);
      setProposalDesc("");
    }
  };

  const handleDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (delegateAddress) {
      delegate(delegateAddress);
      setDelegateAddress("");
    }
  };

  const handleVote = (proposalId: number) => {
    vote(proposalId);
  };

  const handleBuyWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (weightAmount > 0) {
      buyWeight(weightAmount);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold mb-4">Panneau du votant</h2>

      {/* Affichage des informations sur l'état du vote de l'utilisateur */}
      <div className="mb-4">
        <div className="p-3 bg-gray-100 rounded-lg mb-4">
          <h3 className="font-semibold mb-1">Statut de votre vote</h3>
          {hasVoted && (
            <p className="text-green-600">
              <span className="inline-block mr-2">✓</span>
              Vous avez déjà voté
            </p>
          )}
          {delegated && (
            <p className="text-purple-600">
              <span className="inline-block mr-2">➔</span>
              Vous avez délégué votre vote à {delegated.substring(0, 6)}...
              {delegated.substring(38)}
            </p>
          )}
          {!hasVoted && !delegated && (
            <p className="text-gray-600">Vous n'avez pas encore voté</p>
          )}
        </div>
      </div>

      {isConfirming && (
        <div className="mb-4">
          <Loader />
        </div>
      )}

      {currentStatus === 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Proposer une idée</h3>
          <form onSubmit={handleAddProposal} className="flex flex-col gap-2">
            <textarea
              value={proposalDesc}
              onChange={(e) => setProposalDesc(e.target.value)}
              placeholder="Description de votre proposition"
              className="p-2 border rounded"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={isConfirming}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 self-start"
            >
              {isConfirming ? "En cours..." : "Soumettre la proposition"}
            </button>
          </form>
        </div>
      )}

      {currentStatus === 3 && !hasVoted && !delegated && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Voter pour une proposition
            </h3>
            {proposals.length > 0 ? (
              <div className="grid gap-4">
                {proposals.map((proposal, index) => (
                  <div key={index} className="border p-4 rounded">
                    <p className="mb-2">{proposal.description}</p>
                    <button
                      onClick={() => handleVote(index)}
                      disabled={isConfirming}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {isConfirming
                        ? "En cours..."
                        : "Voter pour cette proposition"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>Aucune proposition disponible pour le vote.</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Déléguer votre vote</h3>
            <form onSubmit={handleDelegate} className="flex gap-2">
              <input
                type="text"
                value={delegateAddress}
                onChange={(e) => setDelegateAddress(e.target.value)}
                placeholder="Adresse Ethereum du délégué"
                className="flex-grow p-2 border rounded"
                required
              />
              <button
                type="submit"
                disabled={isConfirming}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
              >
                {isConfirming ? "En cours..." : "Déléguer"}
              </button>
            </form>
          </div>
        </>
      )}

      {currentStatus === 3 && !hasVoted && !delegated && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">
            Augmenter votre poids de vote
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Vous pouvez acheter du poids de vote supplémentaire. Chaque wei
            envoyé augmente votre poids de 1.
          </p>
          <form onSubmit={handleBuyWeight} className="flex gap-2">
            <input
              type="number"
              min="1"
              value={weightAmount}
              onChange={(e) => setWeightAmount(parseInt(e.target.value))}
              className="w-32 p-2 border rounded"
              required
            />
            <button
              type="submit"
              disabled={isConfirming}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:bg-gray-400"
            >
              {isConfirming ? "En cours..." : "Acheter du poids"}
            </button>
          </form>
        </div>
      )}

      {currentStatus === 3 && (hasVoted || delegated) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          {hasVoted && (
            <p>
              Vous avez déjà voté. Vous ne pouvez pas voter à nouveau ou
              déléguer votre vote.
            </p>
          )}
          {delegated && (
            <p>
              Vous avez délégué votre vote. Votre délégué votera en votre nom.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VoterPanel;
