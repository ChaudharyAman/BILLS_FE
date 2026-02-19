import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const PageLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <FaSpinner className="h-10 w-10 text-teal-600 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Loading...</p>
    </div>
  );
};

export default PageLoader;
