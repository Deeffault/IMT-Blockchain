import React, { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  type: "success" | "error";
  onClose: () => void;
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Délai pour l'animation
    }, 4700); // Un peu moins que les 5000ms du contexte pour éviter les chevauchements

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";

  return (
    <div
      className={`max-w-sm p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 ${bgColor} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="flex justify-between items-center">
        <p className="pr-4 break-words">{message}</p>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 text-white flex-shrink-0"
        >
          x
        </button>
      </div>
    </div>
  );
};

export default Toast;
