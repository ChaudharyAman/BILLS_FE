import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';

const GST_UNITS = [
  { code: 'BAG', name: 'Bags' },
  { code: 'BAL', name: 'Bale' },
  { code: 'BDL', name: 'Bundles' },
  { code: 'BKL', name: 'Buckles' },
  { code: 'BOU', name: 'Billions of units' },
  { code: 'BOX', name: 'Box' },
  { code: 'BTL', name: 'Bottles' },
  { code: 'BUN', name: 'Bunches' },
  { code: 'CAN', name: 'Cans' },
  { code: 'CBM', name: 'Cubic meters' },
  { code: 'CCM', name: 'Cubic centimeters' },
  { code: 'CMS', name: 'Centimeters' },
  { code: 'CTN', name: 'Cartons' },
  { code: 'DOZ', name: 'Dozens' },
  { code: 'DRM', name: 'Drums' },
  { code: 'GGK', name: 'Great gross' },
  { code: 'GMS', name: 'Grams' },
  { code: 'GRS', name: 'Gross' },
  { code: 'GYD', name: 'Gross yards' },
  { code: 'KGS', name: 'Kilograms' },
  { code: 'KLR', name: 'Kilolitre' },
  { code: 'KME', name: 'Kilometre' },
  { code: 'MLT', name: 'Millilitre' },
  { code: 'MTR', name: 'Meters' },
  { code: 'NOS', name: 'Numbers' },
  { code: 'PAC', name: 'Packs' },
  { code: 'PCS', name: 'Pieces' },
  { code: 'PRS', name: 'Pairs' },
  { code: 'QTL', name: 'Quintal' },
  { code: 'ROL', name: 'Rolls' },
  { code: 'SET', name: 'Sets' },
  { code: 'SQF', name: 'Square feet' },
  { code: 'SQM', name: 'Square meters' },
  { code: 'SQY', name: 'Square yards' },
  { code: 'TBS', name: 'Tablets' },
  { code: 'TGM', name: 'Ten Gross' },
  { code: 'THD', name: 'Thousands' },
  { code: 'TON', name: 'Tonnes' },
  { code: 'TUB', name: 'Tubes' },
  { code: 'UGS', name: 'US Gallons' },
  { code: 'UNT', name: 'Units' },
  { code: 'YDS', name: 'Yards' },
  { code: 'OTH', name: 'Others' },
];

const UnitSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Unit Form State
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');

  const [customUnits, setCustomUnits] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const addNameRef = useRef(null);

  // Load custom units from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flance_custom_units');
    if (saved) {
      try {
        setCustomUnits(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse custom units', e);
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

  // Combine GST units and any custom units
  const allUnits = [...GST_UNITS, ...customUnits];

  const filteredUnits = allUnits.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    unit.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (unit) => {
    onChange(unit.code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const startAdding = () => {
    setIsAdding(true);
    setNewUnitName(searchTerm); // Pre-fill name with search term
    setNewUnitCode(searchTerm.substring(0, 3).toUpperCase()); // Suggest first 3 chars as code
    setTimeout(() => addNameRef.current?.focus(), 0);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewUnitName('');
    setNewUnitCode('');
  };

  const confirmAdd = () => {
    if (!newUnitName || !newUnitCode) return;

    const newUnit = { 
      name: newUnitName, 
      code: newUnitCode.toUpperCase() 
    };

    const updatedCustomUnits = [...customUnits, newUnit];
    setCustomUnits(updatedCustomUnits);
    localStorage.setItem('flance_custom_units', JSON.stringify(updatedCustomUnits));
    
    onChange(newUnit.code);
    setIsAdding(false);
    setIsOpen(false);
    setSearchTerm('');
    setNewUnitName('');
    setNewUnitCode('');
  };

  const getDisplayValue = () => {
     if (!value) return '';
     const unit = allUnits.find(u => u.code === value);
     return unit ? `${unit.name} (${unit.code})` : value;
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="w-full border border-gray-300 dark:border-slate-700 rounded-md shadow-sm p-2 flex items-center justify-between bg-white dark:bg-slate-800 cursor-pointer hover:border-teal-500 transition-colors"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          } else {
            setIsOpen(false);
          }
        }}
      >
        <span className={`block truncate ${!value ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-slate-100'}`}>
          {getDisplayValue() || 'Select Unit'}
        </span>
        <FaChevronDown size={16} className="text-gray-400 dark:text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 max-h-72 rounded-xl py-1 text-base overflow-hidden sm:text-sm flex flex-col">
          
          {!isAdding ? (
            <>
              <div className="sticky top-0 bg-white dark:bg-slate-900 p-2 border-b border-slate-200 dark:border-slate-800 z-20">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="overflow-y-auto max-h-48 divide-y divide-slate-50 dark:divide-slate-800/40">
                {filteredUnits.length > 0 ? (
                  filteredUnits.map((unit) => (
                    <div
                      key={unit.code}
                      className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-colors ${value === unit.code ? 'text-teal-900 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 font-semibold' : 'text-gray-900 dark:text-slate-200'}`}
                      onClick={() => handleSelect(unit)}
                    >
                      <span className={`block truncate ${value === unit.code ? 'font-semibold' : 'font-normal'}`}>
                        {unit.name} ({unit.code})
                      </span>
                      {value === unit.code && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-teal-600 dark:text-teal-400">
                          <FaCheck size={16} />
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-2 px-3 text-gray-500 dark:text-slate-400 text-sm italic">
                      No matches found
                  </div>
                )}
              </div>
              
              <div 
                className="bg-gray-50 dark:bg-slate-800/80 p-2 border-t border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400 font-medium flex items-center gap-2 transition-colors"
                onClick={startAdding}
              >
                <FaPlus size={16} />
                Add new unit
              </div>
            </>
          ) : (
            <div className="p-3 bg-gray-50 dark:bg-slate-800/80">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-2">Add Custom Unit</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-700 dark:text-slate-300 mb-1">Unit Name</label>
                  <input
                    ref={addNameRef}
                    type="text"
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    placeholder="e.g. Bundle"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 dark:text-slate-300 mb-1">Unit Code (Short)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md p-1.5 focus:ring-teal-500 focus:border-teal-500 outline-none uppercase"
                    placeholder="e.g. BDL"
                    value={newUnitCode}
                    onChange={(e) => setNewUnitCode(e.target.value.toUpperCase())}
                    maxLength={5}
                  />
                </div>
                
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={confirmAdd}
                    disabled={!newUnitName || !newUnitCode}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Unit
                  </button>
                  <button
                    type="button"
                    onClick={cancelAdding}
                    className="flex-shrink-0 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded py-1.5 px-3 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
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

export default UnitSelector;
