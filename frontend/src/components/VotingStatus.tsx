import React from "react";
import { useVotingContract, WorkflowStatus } from "../hooks/useVotingContract";

const VotingStatus: React.FC = () => {
  const { currentStatus } = useVotingContract();

  const getStatusInfo = (
    status: WorkflowStatus
  ): { text: string; color: string } => {
    const statusInfo = [
      {
        text: "Enregistrement des votants",
        color: "bg-blue-100 text-blue-800",
      },
      {
        text: "Enregistrement des propositions",
        color: "bg-green-100 text-green-800",
      },
      {
        text: "Fin d'enregistrement des propositions",
        color: "bg-yellow-100 text-yellow-800",
      },
      {
        text: "Session de vote en cours",
        color: "bg-purple-100 text-purple-800",
      },
      { text: "Session de vote terminée", color: "bg-red-100 text-red-800" },
      { text: "Votes comptabilisés", color: "bg-indigo-100 text-indigo-800" },
    ];
    return statusInfo[status];
  };

  const statusInfo = getStatusInfo(currentStatus);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold mb-4">Statut du vote</h2>
      <div className="flex flex-col items-start space-y-4">
        <div
          className={`${statusInfo.color} py-2 px-4 rounded-full text-sm font-semibold`}
        >
          {statusInfo.text}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${(currentStatus / 5) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between w-full text-xs text-gray-600 mt-1">
          <span>Début</span>
          <span>Fin</span>
        </div>
      </div>
    </div>
  );
};

export default VotingStatus;
