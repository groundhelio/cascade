
import React from 'react';

interface LoaderProps {
  text: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="absolute inset-0 bg-white flex flex-col justify-center items-center z-50">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900 mb-4"></div>
      <p className="text-xl text-gray-900 font-semibold">{text}</p>
    </div>
  );
};

export default Loader;
