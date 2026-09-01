import React, { useState, useRef, useEffect } from 'react';
import { FaPencilAlt, FaPlus } from 'react-icons/fa';

/**
 * ItemSelect — a searchable dropdown for selecting inventory items.
 *
 * Props:
 *   items        – array of item objects { _id, name, ... }
 *   value        – currently selected item _id (or '')
 *   onChange     – called with the selected item object when user picks one
 *   onAddNew     – called when user clicks "+ Add new item"
 *   onEdit       – called with item object when user clicks the edit pencil
 */
const ItemSelect = ({ items = [], value, displayValue = '', onChange, onAddNew, onEdit, testId = '' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const selected = items.find(i => i._id === value) || null;
  const selectedLabel = selected?.name || displayValue || 'Select Item';

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item) => {
    onChange(item);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        data-testid={testId || undefined}
        className={`w-full flex items-center justify-between border border-gray-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 cursor-pointer text-left transition-colors ${
          selected || displayValue ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
        }`}
      >
        <span className="truncate">
          {selectedLabel}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 ml-1.5 text-gray-500 dark:text-slate-400">
          <path d={open ? 'M2 8L6 4L10 8' : 'M2 4L6 8L10 4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-blue-500 dark:border-blue-500 rounded-lg shadow-xl z-50 min-w-[220px] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-800">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid={testId ? `${testId}-search` : undefined}
              placeholder="Type to search"
              className="w-full border border-blue-500 dark:border-blue-400 rounded-md px-2.5 py-1 text-xs outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400"
            />
          </div>

          {/* Item list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500">No items found</div>
            ) : (
              filtered.map(item => (
                <div
                  key={item._id}
                  className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer text-xs transition-colors ${
                    item._id === value 
                      ? 'bg-slate-600 text-white' 
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-slate-200'
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  <span className="truncate">{item.name}</span>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(item); setOpen(false); setSearch(''); }}
                      className={`ml-1.5 p-1 rounded transition-colors flex-shrink-0 ${
                        item._id === value 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <FaPencilAlt size={10} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add new item */}
          {onAddNew && (
            <div className="border-t border-gray-100 dark:border-slate-800 px-3 py-2">
              <button
                type="button"
                onClick={() => { onAddNew(); setOpen(false); setSearch(''); }}
                data-testid={testId ? `${testId}-add-new` : undefined}
                className="bg-transparent border-none text-blue-600 dark:text-blue-400 text-xs font-semibold cursor-pointer p-0 flex items-center gap-1 hover:underline"
              >
                <FaPlus size={10} /> Add new item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemSelect;
