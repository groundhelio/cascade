
import React from 'react';

interface LoaderProps {
  text: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex flex-col justify-center items-center z-50">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
      <p className="text-xl text-white font-semibold">{text}</p>
    </div>
  );
};

export default Loader;
