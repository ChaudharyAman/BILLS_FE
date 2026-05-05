import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaPlus, FaCheck } from 'react-icons/fa';

const STANDARD_RATES = [
  { value: 0, label: '0% (Nil)' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];

const TaxRateSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Rate Form State
  const [newRate, setNewRate] = useState('');

  const [customRates, setCustomRates] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const addInputRef = useRef(null);

  // Load custom rates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flance_custom_tax_rates');
    if (saved) {
      try {
        setCustomRates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse custom tax rates', e);
      }
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Combine Standard and Custom rates
  // Ensure unique values if user adds a standard rate as custom
  const allRates = [...STANDARD_RATES];
  customRates.forEach(cr => {
    if (!allRates.find(r => r.value === cr.value)) {
      allRates.push(cr);
    }
  });

  // Filter based on search
  const filteredRates = allRates.filter(rate => 
    rate.label.toString().includes(searchTerm) || 
    rate.value.toString().includes(searchTerm)
  );

  const handleSelect = (rateValue) => {
    onChange(rateValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const startAdding = () => {
    setIsAdding(true);
    // Pre-fill with search term if it's a number
    if (!isNaN(parseFloat(searchTerm))) {
        setNewRate(searchTerm);
    }
    setTimeout(() => addInputRef.current?.focus(), 0);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewRate('');
  };

  const confirmAdd = () => {
    const rateValue = parseFloat(newRate);
    if (isNaN(rateValue)) return;

    const newCustomRate = { 
      value: rateValue, 
      label: `${rateValue}%` 
    };

    // Check if valid
    if (rateValue < 0) return;

    // Save if not exists
    if (!customRates.find(r => r.value === rateValue)) {
        const updatedCustomRates = [...customRates, newCustomRate].sort((a,b) => a.value - b.value);
        setCustomRates(updatedCustomRates);
        localStorage.setItem('flance_custom_tax_rates', JSON.stringify(updatedCustomRates));
    }
    
    onChange(rateValue);
    setIsAdding(false);
    setIsOpen(false);
    setSearchTerm('');
    setNewRate('');
  };

  const getDisplayValue = () => {
     const rate = allRates.find(r => r.value === Number(value));
     return rate ? rate.label : `${value}%`;
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="w-full border border-gray-300 rounded-md shadow-sm p-2 flex items-center justify-between bg-white cursor-pointer hover:border-teal-500"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          } else {
            setIsOpen(false);
          }
        }}
      >
        <span className="block truncate text-gray-900">
          {getDisplayValue()}
        </span>
        <FaChevronDown size={16} className="text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden sm:text-sm flex flex-col">
          
          {!isAdding ? (
            <>
              <div className="sticky top-0 bg-white p-2 border-b z-20">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder="Search rate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="overflow-y-auto max-h-40">
                {filteredRates.length > 0 ? (
                  filteredRates.map((rate) => (
                    <div
                      key={rate.value}
                      className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-teal-50 ${Number(value) === rate.value ? 'text-teal-900 bg-teal-50' : 'text-gray-900'}`}
                      onClick={() => handleSelect(rate.value)}
                    >
                      <span className={`block truncate ${Number(value) === rate.value ? 'font-semibold' : 'font-normal'}`}>
                        {rate.label}
                      </span>
                      {Number(value) === rate.value && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-teal-600">
                          <FaCheck size={16} />
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-2 px-3 text-gray-500 text-sm italic">
                      No matches found
                  </div>
                )}
              </div>
              
              <div 
                className="bg-gray-50 p-2 border-t cursor-pointer hover:bg-gray-100 text-teal-600 font-medium flex items-center gap-2"
                onClick={startAdding}
              >
                <FaPlus size={16} />
                Add custom rate
              </div>
            </>
          ) : (
            <div className="p-3 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Custom Tax Rate</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={addInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-300 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    placeholder="e.g. 2.5"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmAdd();
                        if (e.key === 'Escape') cancelAdding();
                    }}
                  />
                  <span className="text-gray-500 font-medium">%</span>
                </div>
                
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={confirmAdd}
                    disabled={!newRate}
                    className="flex-1 bg-teal-600 text-white rounded py-1.5 text-xs font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={cancelAdding}
                    className="flex-shrink-0 bg-white border border-gray-300 text-gray-700 rounded py-1.5 px-3 text-xs font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxRateSelector;
