import React from 'react';

const SECTIONS = [
  { value: '194J', label: '194J - Professional/Technical', rate: 10 },
  { value: '194C-1', label: '194C - Contractor Individual/HUF', section: '194C', rate: 1 },
  { value: '194C-2', label: '194C - Contractor Others', section: '194C', rate: 2 },
  { value: '194I', label: '194I - Rent', rate: 10 },
  { value: '194A', label: '194A - Interest', rate: 10 },
  { value: 'Manual', label: 'Manual', rate: 0 },
];

export default function TDSSectionDropdown({ section = '194J', rate = 10, baseAmount = 0, onChange }) {
  const activeValue = section === '194C' && Number(rate) === 1 ? '194C-1' : section === '194C' ? '194C-2' : section;
  const tdsAmount = Math.round(((Number(baseAmount) || 0) * (Number(rate) || 0))) / 100;

  const handleSectionChange = (event) => {
    const selected = SECTIONS.find((item) => item.value === event.target.value) || SECTIONS[0];
    onChange?.({
      tdsSection: selected.section || selected.value,
      tdsRate: selected.value === 'Manual' ? Number(rate) || 0 : selected.rate,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_160px] gap-3">
      <select
        value={activeValue}
        onChange={handleSectionChange}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
      >
        {SECTIONS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        step="0.01"
        value={rate}
        disabled={activeValue !== 'Manual'}
        onChange={(event) => onChange?.({ tdsSection: section, tdsRate: Number(event.target.value) || 0 })}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:bg-gray-50"
      />
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Receivable: Rs {tdsAmount.toLocaleString('en-IN')}
      </div>
    </div>
  );
}
