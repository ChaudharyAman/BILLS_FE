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
const ItemSelect = ({ items = [], value, onChange, onAddNew, onEdit }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const selected = items.find(i => i._id === value) || null;

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
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 13,
          background: '#fff',
          color: selected ? '#111827' : '#9ca3af',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : 'Select Item'}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginLeft: 6 }}>
          <path d={open ? 'M2 8L6 4L10 8' : 'M2 4L6 8L10 4'} stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: '#fff',
          border: '1.5px solid #3b82f6',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
          zIndex: 9999,
          minWidth: 220,
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type to search"
              style={{
                width: '100%',
                border: '1.5px solid #3b82f6',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Item list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 13, color: '#9ca3af' }}>No items found</div>
            ) : (
              filtered.map(item => (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    cursor: 'pointer',
                    background: item._id === value ? '#64748b' : 'transparent',
                    color: item._id === value ? '#fff' : '#111827',
                    fontSize: 13,
                    transition: 'background 0.13s',
                  }}
                  onMouseEnter={e => { if (item._id !== value) e.currentTarget.style.background = '#f3f4f6'; }}
                  onMouseLeave={e => { if (item._id !== value) e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => handleSelect(item)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(item); setOpen(false); setSearch(''); }}
                      style={{
                        background: item._id === value ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 6px',
                        cursor: 'pointer',
                        color: item._id === value ? '#fff' : '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: 6,
                        flexShrink: 0,
                      }}
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
            <div
              style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}
            >
              <button
                type="button"
                onClick={() => { onAddNew(); setOpen(false); setSearch(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
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
