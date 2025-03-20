import React, { useState, useEffect } from "react";
import { useVotingContract, WorkflowStatus } from "../hooks/useVotingContract";
import { useAccount } from "wagmi";

const AdminPanel: React.FC = () => {
  const [voterAddress, setVoterAddress] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>({});

  const { address } = useAccount(); // Get connected address directly

  const {
    isOwner,
    currentStatus,
    registerVoter,
    startProposalsRegistration,
    endProposalsRegistration,
    startVotingSession,
    endVotingSession,
    tallyVotes,
    withdrawFunds,
    isConfirming,
  } = useVotingContract();

  // Add debug logging
  useEffect(() => {
    console.log("Connected address:", address);
    console.log("isOwner value:", isOwner);
    console.log("Current status:", currentStatus);

    setDebugInfo({
      address,
      isOwner,
      currentStatus,
    });
  }, [address, isOwner, currentStatus]);

  // Show debugging panel if admin panel doesn't appear
  if (!isOwner) {
    return null;
  }

  const handleRegisterVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (voterAddress) {
      registerVoter(voterAddress);
      setVoterAddress("");
    }
  };

  const getStatusText = (status: WorkflowStatus): string => {
    const statusTexts = [
      "Enregistrement des votants",
      "Enregistrement des propositions",
      "Fin d'enregistrement des propositions",
      "Session de vote en cours",
      "Session de vote terminée",
      "Votes comptabilisés",
    ];
    return statusTexts[status];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold mb-4">Panneau d'administration</h2>
      <p className="mb-4">
        Statut actuel:{" "}
        <span className="font-semibold">{getStatusText(currentStatus)}</span>
      </p>

      {currentStatus === 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Enregistrer un votant</h3>
          <form onSubmit={handleRegisterVoter} className="flex gap-2">
            <input
              type="text"
              value={voterAddress}
              onChange={(e) => setVoterAddress(e.target.value)}
              placeholder="Adresse Ethereum du votant"
              className="flex-grow p-2 border rounded"
              required
            />
            <button
              type="submit"
              disabled={isConfirming}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isConfirming ? "En cours..." : "Enregistrer"}
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {currentStatus === 0 && (
          <button
            onClick={startProposalsRegistration}
            disabled={isConfirming}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Démarrer l'enregistrement des propositions
          </button>
        )}

        {currentStatus === 1 && (
          <button
            onClick={endProposalsRegistration}
            disabled={isConfirming}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
          >
            Terminer l'enregistrement des propositions
          </button>
        )}

        {currentStatus === 2 && (
          <button
            onClick={startVotingSession}
            disabled={isConfirming}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            Démarrer la session de vote
          </button>
        )}

        {currentStatus === 3 && (
          <button
            onClick={endVotingSession}
            disabled={isConfirming}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            Terminer la session de vote
          </button>
        )}

        {currentStatus === 4 && (
          <button
            onClick={tallyVotes}
            disabled={isConfirming}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:bg-gray-400"
          >
            Comptabiliser les votes
          </button>
        )}

        {isOwner && (
          <button
            onClick={withdrawFunds}
            disabled={isConfirming}
            className="bg-purple-800 text-white px-4 py-2 rounded hover:bg-purple-900 disabled:bg-gray-400"
          >
            {isConfirming ? "En cours..." : "Retirer les fonds"}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
