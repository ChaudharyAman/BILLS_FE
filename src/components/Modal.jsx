import React from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background Overlay */}
        <div 
          className="fixed inset-0 transition-opacity" 
          aria-hidden="true" 
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal Panel */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div 
          className="inline-block align-bottom bg-white dark:bg-slate-900 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-slate-200 dark:border-slate-800"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-slate-100" id="modal-title">
                {title}
              </h3>
              <button 
                onClick={onClose}
                className="bg-transparent rounded-full p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-slate-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto text-slate-800 dark:text-slate-200">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Modal;
