import React, { useEffect, useState } from "react";
import { useVotingContract } from "../hooks/useVotingContract";

const VoterPanel: React.FC = () => {
  const [proposalDesc, setProposalDesc] = useState("");
  const [delegateAddress, setDelegateAddress] = useState("");
  const {
    currentStatus,
    isVoter,
    proposals,
    addProposal,
    delegate,
    vote,
    isConfirming,
  } = useVotingContract();

  useEffect(() => {
    console.log("isVoter:", isVoter);
    console.log("currentStatus:", currentStatus);
    console.log("proposals:", proposals);
  }, [isVoter, currentStatus, proposals]);

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

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold mb-4">Panneau du votant</h2>

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

      {currentStatus === 3 && (
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
    </div>
  );
};

export default VoterPanel;
