import React from "react";

type LoaderProps = {
  message?: string;
  isReloading?: boolean;
};

const Loader: React.FC<LoaderProps> = ({
  message = "Transaction en cours...",
  isReloading = false,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center mb-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">{message}</span>
      </div>
      {isReloading && (
        <span className="text-sm text-gray-500">
          Les données seront automatiquement mises à jour
        </span>
      )}
    </div>
  );
};

export default Loader;
