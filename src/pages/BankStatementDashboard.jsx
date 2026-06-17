import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  FaArrowDown, FaArrowUp, FaSearch, FaDownload,
  FaExchangeAlt, FaChartLine, FaWallet, FaChevronLeft, FaChevronRight,
  FaCalendarAlt, FaUniversity, FaFilter, FaTimes,
} from 'react-icons/fa';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import api from '../api/axios';

/* ─── Formatting Helpers ─── */
const fmt = (v, d = 2) =>
  `₹${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

const fmtCompact = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444', '#84cc16'];

/* ─── Date Parsing ─── */
const parseDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();

  // DD-MM-YYYY or DD/MM/YYYY
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  // DD/Mon/YYYY (e.g. 24/Apr/2025)
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  m = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{4})/);
  if (m && months[m[2].toLowerCase()] !== undefined) return new Date(+m[3], months[m[2].toLowerCase()], +m[1]);

  // DD-Mon-YYYY with space (e.g. 24 Apr 2025)
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (m && months[m[2].toLowerCase()] !== undefined) return new Date(+m[3], months[m[2].toLowerCase()], +m[1]);

  // YYYY-MM-DD
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // Excel serial number
  if (/^\d{5}$/.test(s)) {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + (+s) * 86400000);
  }

  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (d) => {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/* ─── Category Detection ─── */
const categorize = (desc) => {
  if (!desc) return 'Other';
  const d = desc.toLowerCase();
  if (d.includes('upi')) return 'UPI';
  if (d.includes('neft') || d.includes('rtgs')) return 'NEFT/RTGS';
  if (d.includes('imps')) return 'IMPS';
  if (d.includes('atm') || d.includes('cash withdrawal')) return 'ATM';
  if (d.includes('interest') || d.includes('int ')) return 'Interest';
  if (d.includes('salary') || d.includes('sal ')) return 'Salary';
  if (d.includes('emi') || d.includes('loan')) return 'EMI/Loan';
  if (d.includes('gst') || d.includes('tax') || d.includes('tds')) return 'Tax/GST';
  if (d.includes('chg') || d.includes('charge') || d.includes('fee') || d.includes('commission')) return 'Bank Charges';
  if (d.includes('transfer') || d.includes('trf')) return 'Transfer';
  if (d.includes('card') || d.includes('pos')) return 'Card/POS';
  if (d.includes('cheque') || d.includes('chq')) return 'Cheque';
  if (d.includes('refund') || d.includes('reversal')) return 'Refund';
  if (d.includes('dividend')) return 'Dividend';
  if (d.includes('insurance')) return 'Insurance';
  if (d.includes('bill') || d.includes('recharge') || d.includes('electricity') || d.includes('mobile')) return 'Bills/Utilities';
  return 'Other';
};

/* ─── Smart Column Mapper ─── */
const COLUMN_MAPS = [
  // Format 1 — Cr/D + Tran column
  {
    detect: (cols) => cols.some(c => /^cr[\/\.]?d$/i.test(c)) && cols.some(c => /^tran$/i.test(c)),
    map: (cols) => {
      const lower = cols.map(c => c.toLowerCase().trim());
      return {
        date: cols[lower.findIndex(c => /value\s*date/i.test(c))] || cols[lower.findIndex(c => /date/i.test(c))],
        description: cols[lower.findIndex(c => /description/i.test(c))],
        crDr: cols[lower.findIndex(c => /^cr[\/\.]?d$/i.test(c))],
        amount: cols[lower.findIndex(c => /^tran$/i.test(c))],
        balance: cols[lower.findIndex(c => /available|balance/i.test(c))],
        txnId: cols[lower.findIndex(c => /transaction.*id|trans.*id|txn.*id/i.test(c))] || cols[lower.findIndex(c => /^no\.?$/i.test(c))],
        type: 'crdr',
      };
    },
  },
  // Format 2 — Withdrawal + Deposit columns
  {
    detect: (cols) => cols.some(c => /withdrawal/i.test(c)) && cols.some(c => /deposit/i.test(c)),
    map: (cols) => {
      const lower = cols.map(c => c.toLowerCase().trim());
      return {
        date: cols[lower.findIndex(c => /value\s*date/i.test(c))] || cols[lower.findIndex(c => /transaction\s*date/i.test(c))] || cols[lower.findIndex(c => /date/i.test(c))],
        description: cols[lower.findIndex(c => /remark|description|particular/i.test(c))],
        withdrawal: cols[lower.findIndex(c => /withdrawal/i.test(c))],
        deposit: cols[lower.findIndex(c => /^deposit$/i.test(c))] || cols[lower.findIndex(c => /deposit\s*amt/i.test(c))],
        balance: cols[lower.findIndex(c => /balance/i.test(c))],
        txnId: cols[lower.findIndex(c => /tran.*id|transaction.*id/i.test(c))] || cols[lower.findIndex(c => /^s\.?n\.?$/i.test(c))],
        type: 'wd',
      };
    },
  },
  // Format 3 — Debit + Credit columns
  {
    detect: (cols) => cols.some(c => /^debit$/i.test(c)) && cols.some(c => /^credit$/i.test(c)),
    map: (cols) => {
      const lower = cols.map(c => c.toLowerCase().trim());
      return {
        date: cols[lower.findIndex(c => /value\s*date/i.test(c))] || cols[lower.findIndex(c => /date/i.test(c))],
        description: cols[lower.findIndex(c => /description|particular|remark|narration/i.test(c))],
        withdrawal: cols[lower.findIndex(c => /^debit$/i.test(c))],
        deposit: cols[lower.findIndex(c => /^credit$/i.test(c))],
        balance: cols[lower.findIndex(c => /balance/i.test(c))],
        txnId: cols[lower.findIndex(c => /ref|id|no/i.test(c))],
        type: 'wd',
      };
    },
  },
];

const parseNum = (v) => {
  if (v === null || v === undefined || v === '' || v === '-') return 0;
  const s = String(v).replace(/[₹,\s]/g, '');
  return Math.abs(Number(s)) || 0;
};

/* ─── Normalize Rows ─── */

/** Check if a set of column names matches any known format */
const tryDetect = (cols) => {
  for (const cm of COLUMN_MAPS) {
    if (cm.detect(cols)) return cm.map(cols);
  }
  return null;
};

/** Check if a row's values look like column headers */
const looksLikeHeaders = (values) => {
  const joined = values.join(' ').toLowerCase();
  const hasDate = /\bdate\b/.test(joined);
  const hasDesc = /\b(desc|remark|particular|narration|transaction\s*remark)\b/.test(joined);
  const hasAmt = /\b(tran|amount|withdrawal|deposit|debit|credit|cr[\/.]*d)\b/.test(joined);
  const hasBalance = /\b(balance|available)\b/.test(joined);
  return hasDate && (hasAmt || (hasDesc && hasBalance));
};

/**
 * Returns { transactions, debug } where debug contains full parsing metadata
 */
const normalizeData = (rawRows) => {
  const debug = {
    totalRawRows: rawRows?.length || 0,
    originalHeaders: [],
    headerRowIndex: 0,
    detectedHeaders: [],
    hadTitleRows: false,
    mapping: null,
    formatType: 'unknown',
    skippedRows: 0,
    rawSample: [],
  };

  if (!rawRows?.length) return { transactions: [], debug };

  debug.originalHeaders = Object.keys(rawRows[0]);
  debug.rawSample = rawRows.slice(0, 5).map(r => ({ ...r }));

  let cols = Object.keys(rawRows[0]);
  let mapping = tryDetect(cols);
  let dataRows = rawRows;

  if (mapping) {
    debug.detectedHeaders = cols;
    debug.headerRowIndex = 0;
    debug.hadTitleRows = false;
  }

  // ── If no mapping found, scan for real header row ──
  if (!mapping) {
    for (let i = 0; i < Math.min(15, rawRows.length); i++) {
      const rowValues = Object.values(rawRows[i]).map(v => String(v ?? '').trim()).filter(Boolean);
      if (rowValues.length < 3) continue;

      if (looksLikeHeaders(rowValues)) {
        const newCols = Object.values(rawRows[i]).map(v => String(v ?? '').trim());
        mapping = tryDetect(newCols);

        if (mapping) {
          debug.headerRowIndex = i;
          debug.hadTitleRows = true;
          debug.detectedHeaders = newCols;

          const originalKeys = Object.keys(rawRows[0]);
          dataRows = rawRows.slice(i + 1).map(row => {
            const obj = {};
            originalKeys.forEach((origKey, j) => {
              const newKey = newCols[j] || `col_${j}`;
              obj[newKey] = row[origKey];
            });
            return obj;
          });
          break;
        }
      }
    }
  }

  // ── Fallback ──
  if (!mapping) {
    const finalCols = dataRows === rawRows ? cols : Object.keys(dataRows[0] || {});
    const lower = finalCols.map(c => (c || '').toLowerCase().trim());
    mapping = {
      date: finalCols[lower.findIndex(c => /date/i.test(c))] || finalCols[0],
      description: finalCols[lower.findIndex(c => /desc|remark|particular|narration/i.test(c))] || finalCols[1],
      balance: finalCols[lower.findIndex(c => /balance|available/i.test(c))],
      type: 'unknown',
    };
    const amtIdx = lower.findIndex(c => /amount|amt|tran$/i.test(c));
    if (amtIdx >= 0) {
      mapping.amount = finalCols[amtIdx];
      mapping.crDr = finalCols[lower.findIndex(c => /cr[\/.]*d|type/i.test(c))];
      mapping.type = 'crdr';
    }
    const wdIdx = lower.findIndex(c => /withdrawal|debit/i.test(c));
    const depIdx = lower.findIndex(c => /deposit|credit/i.test(c));
    if (wdIdx >= 0 && depIdx >= 0) {
      mapping.withdrawal = finalCols[wdIdx];
      mapping.deposit = finalCols[depIdx];
      mapping.type = 'wd';
    }
    debug.detectedHeaders = finalCols;
    debug.formatType = 'fallback';
  }

  debug.mapping = mapping;
  debug.formatType = debug.formatType === 'fallback' ? 'fallback' : mapping.type;

  // ── Parse rows ──
  const normalized = [];
  let skipped = 0;
  for (const row of dataRows) {
    let rawDateVal = row[mapping.date];
    let date = null;

    if (rawDateVal instanceof Date && !isNaN(rawDateVal.getTime())) {
      date = rawDateVal;
    } else {
      date = parseDate(rawDateVal);
    }

    if (!date) { skipped++; continue; }

    let debit = 0, credit = 0;
    if (mapping.type === 'crdr') {
      const amt = parseNum(row[mapping.amount]);
      const dir = String(row[mapping.crDr] || '').trim().toUpperCase();
      if (dir === 'DR' || dir === 'D' || dir === 'DEBIT') debit = amt; else credit = amt;
    } else if (mapping.type === 'wd') {
      debit = parseNum(row[mapping.withdrawal]);
      credit = parseNum(row[mapping.deposit]);
    } else {
      const amt = parseNum(row[mapping.amount]);
      if (amt > 0) credit = amt; else debit = Math.abs(amt);
    }

    const balance = parseNum(row[mapping.balance]);
    if (debit === 0 && credit === 0 && balance === 0) { skipped++; continue; }

    normalized.push({
      date, dateStr: formatDate(date),
      description: String(row[mapping.description] || '').trim(),
      debit, credit, balance,
      category: categorize(String(row[mapping.description] || '')),
      txnId: String(row[mapping.txnId] || '').trim(),
    });
  }

  debug.skippedRows = skipped;
  normalized.sort((a, b) => a.date - b.date);
  return { transactions: normalized, debug };
};

/* ─── Shared UI Components ─── */
const GW = ({ children, className = '' }) => (
  <div className={`glass-water-card p-5 ${className}`}>{children}</div>
);

const SLabel = ({ children }) => (
  <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-3">{children}</div>
);

const TTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-water-card p-3 text-xs min-w-[140px] !rounded-xl">
      <div className="font-bold text-gray-500 mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PAGE_SIZE = 20;

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function BankStatementDashboard() {
  const [savedStatements, setSavedStatements] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [statementFilterId, setStatementFilterId] = useState('all');
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  const [fileName, setFileName] = useState('');
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [parseError, setParseError] = useState('');

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Backend state
  const [saving, setSaving] = useState(false);
  const [activeStatementId, setActiveStatementId] = useState(null);

  // Compute transactions combined from all statements (or filtered by statementFilterId)
  const transactions = useMemo(() => {
    const list = [];
    savedStatements.forEach(s => {
      if (statementFilterId !== 'all' && s._id !== statementFilterId) return;
      (s.transactions || []).forEach(t => {
        list.push({
          ...t,
          date: new Date(t.date),
          dateStr: formatDate(new Date(t.date)),
          statementId: s._id,
          statementName: s.label || s.fileName
        });
      });
    });
    list.sort((a, b) => a.date - b.date);
    return list;
  }, [savedStatements, statementFilterId]);

  /* ─── Load saved statements on mount ─── */
  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const { data } = await api.get('/bank-statements?includeTransactions=true');
        setSavedStatements(data.data || []);
      } catch (err) {
        console.warn('[BankStatement] Could not load saved statements:', err.message);
      } finally {
        setLoadingSaved(false);
      }
    };
    fetchSaved();
  }, []);

  /* ─── Handle Upload ─── */
  const handleData = useCallback((data, file) => {
    setParseError('');
    setShowPreview(false);

    const result = normalizeData(data);
    console.log('[BankStatement] Debug:', result.debug);

    if (!result.transactions.length && data?.length) {
      setParseError(
        `Could not detect columns from your file (${data.length} rows read). ` +
        `Detected headers: [${Object.keys(data[0] || {}).join(', ')}]. ` +
        `Please ensure your file has columns like Date, Description, Amount/Withdrawal/Deposit, Balance.`
      );
      setPreviewData({ transactions: [], debug: result.debug, rawData: data });
      setShowPreview(true);
      setFileName(file?.name || 'Uploaded File');
      return;
    }

    setPreviewData({ transactions: result.transactions, debug: result.debug, rawData: data });
    setShowPreview(true);
    setFileName(file?.name || 'Uploaded File');
  }, []);

  /* ─── Confirm, save to backend, and proceed to dashboard ─── */
  const confirmAndProceed = useCallback(async () => {
    if (!previewData?.transactions?.length) return;

    const txns = previewData.transactions;

    // Save to backend
    setSaving(true);
    try {
      const payload = {
        fileName,
        transactions: txns.map(t => ({
          date: t.date,
          description: t.description,
          debit: t.debit,
          credit: t.credit,
          balance: t.balance,
          category: t.category,
          txnId: t.txnId,
        })),
      };
      const { data } = await api.post('/bank-statements', payload);
      setActiveStatementId(data._id);
      
      // Refresh saved list with transactions
      const listRes = await api.get('/bank-statements?includeTransactions=true');
      setSavedStatements(listRes.data.data || []);
      console.log('[BankStatement] Saved to backend, id:', data._id);

      // Clear preview states ONLY on success
      setShowPreview(false);
      setPreviewData(null);
      setPage(1);
      setSearch('');
      setDateFrom('');
      setDateTo('');
      setCategoryFilter('');
      setTab('overview');
      setShowUploadPanel(false);

      toast.success('Bank statement uploaded successfully.');
    } catch (err) {
      console.error('[BankStatement] Save failed:', err);
      toast.error(err.response?.data?.message || 'Failed to save bank statement.');
    } finally {
      setSaving(false);
    }
  }, [previewData, fileName]);

  /* ─── Load a previously saved statement (Set filter) ─── */
  const loadSavedStatement = useCallback(async (id) => {
    setStatementFilterId(id);
    setPage(1);
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setCategoryFilter('');
    setTab('overview');
    setShowPreview(false);
    setPreviewData(null);
    setShowUploadPanel(false);
  }, []);

  /* ─── Delete a saved statement ─── */
  const deleteSavedStatement = useCallback(async (id) => {
    try {
      await api.delete(`/bank-statements/${id}`);
      setSavedStatements(prev => prev.filter(s => s._id !== id));
      if (statementFilterId === id) {
        setStatementFilterId('all');
      }
      toast.success('Bank statement deleted successfully.');
    } catch (err) {
      console.error('[BankStatement] Delete failed:', err);
      toast.error('Failed to delete bank statement.');
    }
  }, [statementFilterId]);

  /* ─── Computed Stats ─── */
  const stats = useMemo(() => {
    if (!transactions.length) return null;

    const totalCredits = transactions.reduce((s, t) => s + t.credit, 0);
    const totalDebits = transactions.reduce((s, t) => s + t.debit, 0);
    const netFlow = totalCredits - totalDebits;
    const count = transactions.length;
    const debitTxns = transactions.filter(t => t.debit > 0);
    const creditTxns = transactions.filter(t => t.credit > 0);
    const openingBalance = transactions[0]?.balance || 0;
    const closingBalance = transactions[transactions.length - 1]?.balance || 0;
    const largestDebit = debitTxns.length ? Math.max(...debitTxns.map(t => t.debit)) : 0;
    const largestCredit = creditTxns.length ? Math.max(...creditTxns.map(t => t.credit)) : 0;
    const avgTxn = count > 0 ? (totalCredits + totalDebits) / count : 0;

    return { totalCredits, totalDebits, netFlow, count, openingBalance, closingBalance, largestDebit, largestCredit, avgTxn, debitCount: debitTxns.length, creditCount: creditTxns.length };
  }, [transactions]);

  /* ─── Chart Data ─── */
  const balanceTrend = useMemo(() => {
    if (!transactions.length) return [];
    const map = new Map();
    transactions.forEach(t => {
      const key = formatDate(t.date);
      map.set(key, { date: key, balance: t.balance, debit: (map.get(key)?.debit || 0) + t.debit, credit: (map.get(key)?.credit || 0) + t.credit });
    });
    return [...map.values()];
  }, [transactions]);

  const monthlyData = useMemo(() => {
    if (!transactions.length) return [];
    const map = new Map();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    transactions.forEach(t => {
      const key = `${MONTHS[t.date.getMonth()]} ${t.date.getFullYear()}`;
      if (!map.has(key)) map.set(key, { month: key, Credits: 0, Debits: 0 });
      const e = map.get(key);
      e.Credits += t.credit;
      e.Debits += t.debit;
    });
    return [...map.values()];
  }, [transactions]);

  const categoryData = useMemo(() => {
    if (!transactions.length) return [];
    const map = new Map();
    transactions.forEach(t => {
      const cat = t.category;
      const amt = t.debit + t.credit;
      map.set(cat, (map.get(cat) || 0) + amt);
    });
    return [...map.entries()]
      .map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const volumeData = useMemo(() => {
    if (!transactions.length) return [];
    const map = new Map();
    transactions.forEach(t => {
      const key = formatDate(t.date);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].map(([date, count]) => ({ date, count }));
  }, [transactions]);

  const monthlyStats = useMemo(() => {
    if (!transactions.length) return [];
    const map = new Map();
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    transactions.forEach(t => {
      const year = t.date.getFullYear();
      const monthIdx = t.date.getMonth();
      const key = `${MONTHS[monthIdx]} ${year}`;
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          monthName: MONTHS[monthIdx],
          year,
          monthIdx,
          txns: [],
          totalCredits: 0,
          totalDebits: 0,
          netFlow: 0,
          openingBalance: 0,
          closingBalance: 0,
        });
      }
      const m = map.get(key);
      m.txns.push(t);
      m.totalCredits += t.credit;
      m.totalDebits += t.debit;
    });

    const sortedMonths = [...map.values()].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIdx - b.monthIdx;
    });

    sortedMonths.forEach((m) => {
      m.txns.sort((a, b) => a.date - b.date);
      const first = m.txns[0];
      const last = m.txns[m.txns.length - 1];
      m.openingBalance = first ? (first.balance - first.credit + first.debit) : 0;
      m.closingBalance = last ? last.balance : 0;
      m.netFlow = m.totalCredits - m.totalDebits;
    });

    return sortedMonths;
  }, [transactions]);

  /* ─── Filtered Transactions ─── */
  const filtered = useMemo(() => {
    let out = transactions;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(t => t.description.toLowerCase().includes(q) || t.txnId.toLowerCase().includes(q));
    }
    if (dateFrom) {
      const d = new Date(dateFrom);
      out = out.filter(t => t.date >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      out = out.filter(t => t.date <= d);
    }
    if (categoryFilter) {
      out = out.filter(t => t.category === categoryFilter);
    }
    return out;
  }, [transactions, search, dateFrom, dateTo, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ─── CSV Export ─── */
  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Category', 'Transaction ID'];
    const rows = filtered.map(t => [t.dateStr, `"${t.description}"`, t.debit || '', t.credit || '', t.balance, t.category, t.txnId]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_statement_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = useMemo(() => [...new Set(transactions.map(t => t.category))].sort(), [transactions]);

  /* ─── KPI Definitions ─── */
  const KPIs = stats ? [
    { label: 'Total Credits', value: fmt(stats.totalCredits), icon: FaArrowDown, iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981', sub: `${stats.creditCount} transactions` },
    { label: 'Total Debits', value: fmt(stats.totalDebits), icon: FaArrowUp, iconBg: 'rgba(236,72,153,0.12)', iconColor: '#ec4899', sub: `${stats.debitCount} transactions` },
    { label: 'Net Flow', value: fmt(stats.netFlow), icon: FaExchangeAlt, iconBg: stats.netFlow >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', iconColor: stats.netFlow >= 0 ? '#10b981' : '#ef4444', sub: stats.netFlow >= 0 ? 'Net inflow' : 'Net outflow' },
    { label: 'Total Transactions', value: stats.count.toLocaleString(), icon: FaChartLine, iconBg: 'rgba(99,102,241,0.12)', iconColor: '#6366f1', sub: `Avg: ${fmt(stats.avgTxn)}` },
    { label: 'Largest Debit', value: fmt(stats.largestDebit), icon: FaArrowUp, iconBg: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b', sub: 'Single transaction' },
    { label: 'Largest Credit', value: fmt(stats.largestCredit), icon: FaArrowDown, iconBg: 'rgba(20,184,166,0.12)', iconColor: '#14b8a6', sub: 'Single transaction' },
  ] : [];

  /* ════════════════ RENDER ════════════════ */

  // ── PREVIEW STATE ──
  if (showPreview && previewData) {
    const { debug } = previewData;
    const txns = previewData.transactions;
    const mappingEntries = debug.mapping ? Object.entries(debug.mapping).filter(([k]) => k !== 'type') : [];
    const formatLabels = { crdr: 'Cr/Dr + Amount', wd: 'Withdrawal / Deposit', fallback: 'Fallback (guessed)', unknown: 'Unknown' };

    return (
      <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans">
        <div className="mb-6 animate-rise-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <FaUniversity size={18} className="text-indigo-500" />
            </div>
            Parsed Data Preview
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-[52px]">{fileName} — Review the parsed data before proceeding</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 mb-5 animate-rise-in" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-3">
            {txns.length > 0 && (
              <button onClick={confirmAndProceed}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all">
                ✓ Proceed to Dashboard ({txns.length} transactions)
              </button>
            )}
            <button onClick={() => { setShowPreview(false); setPreviewData(null); setParseError(''); }}
              className="glass-water-pill px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-rose-500 transition-colors">
              ← Re-upload
            </button>
          </div>

        </div>

        {/* Error banner if 0 transactions */}
        {parseError && (
          <div className="mb-5 p-4 rounded-2xl animate-rise-in" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="text-sm font-bold text-rose-600 mb-1">⚠️ Could not parse transactions</div>
            <div className="text-xs text-rose-500 leading-relaxed">{parseError}</div>
          </div>
        )}

        {/* ── Parsing Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GW className="animate-rise-in" style={{ animationDelay: '100ms' }}>
            <SLabel>📋 Parsing Summary</SLabel>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-white/40">
                <span className="text-gray-500 font-medium">Total Raw Rows</span>
                <span className="font-bold text-gray-800">{debug.totalRawRows}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/40">
                <span className="text-gray-500 font-medium">Title Rows Detected</span>
                <span className="font-bold text-gray-800">{debug.hadTitleRows ? `Yes (header at row ${debug.headerRowIndex + 1})` : 'No'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/40">
                <span className="text-gray-500 font-medium">Format Detected</span>
                <span className="font-bold px-2 py-0.5 rounded-lg" style={{
                  background: debug.formatType === 'fallback' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                  color: debug.formatType === 'fallback' ? '#f59e0b' : '#10b981',
                }}>{formatLabels[debug.formatType] || debug.formatType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/40">
                <span className="text-gray-500 font-medium">Transactions Parsed</span>
                <span className={`font-bold ${txns.length > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{txns.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500 font-medium">Rows Skipped</span>
                <span className="font-bold text-gray-500">{debug.skippedRows}</span>
              </div>
            </div>
          </GW>

          {/* Column Mapping */}
          <GW className="animate-rise-in" style={{ animationDelay: '150ms' }}>
            <SLabel>🔗 Column Mapping</SLabel>
            {mappingEntries.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {mappingEntries.map(([field, colName]) => (
                  <div key={field} className="flex items-center gap-2 py-1.5 border-b border-white/40 last:border-0">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>{field}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-gray-700 truncate">{colName || '(not found)'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">No mapping detected</div>
            )}
          </GW>
        </div>

        {/* ── Detected Headers ── */}
        <GW className="mb-5 animate-rise-in" style={{ animationDelay: '200ms' }}>
          <SLabel>📑 Original vs Detected Headers</SLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Original Excel Headers (Row 1)</div>
              <div className="flex flex-wrap gap-1.5">
                {debug.originalHeaders.map((h, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg text-[10px] font-semibold truncate max-w-[200px]" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }} title={h}>{h}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Detected Data Headers {debug.hadTitleRows && `(Row ${debug.headerRowIndex + 1})`}</div>
              <div className="flex flex-wrap gap-1.5">
                {debug.detectedHeaders.map((h, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg text-[10px] font-semibold truncate max-w-[200px]" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }} title={h}>{h || '(empty)'}</span>
                ))}
              </div>
            </div>
          </div>
        </GW>

        {/* ── Raw Data Sample ── */}
        <GW className="mb-5 animate-rise-in" style={{ animationDelay: '250ms' }}>
          <SLabel>📄 Raw Excel Data (First 5 Rows)</SLabel>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-indigo-100/50">
                  <th className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">#</th>
                  {debug.originalHeaders.map((h, i) => (
                    <th key={i} className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400 max-w-[150px] truncate" title={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debug.rawSample.map((row, i) => (
                  <tr key={i} className="border-b border-white/40 hover:bg-white/20 transition-colors">
                    <td className="py-1.5 px-2 text-gray-400 font-mono">{i + 1}</td>
                    {debug.originalHeaders.map((h, j) => {
                      const val = row[h];
                      const display = val instanceof Date ? formatDate(val) : String(val ?? '');
                      return (
                        <td key={j} className="py-1.5 px-2 text-gray-600 max-w-[150px] truncate" title={display}>{display || <span className="text-gray-300">—</span>}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GW>

        {/* ── Normalized Transactions List ── */}
        <GW className="mb-5 animate-rise-in" style={{ animationDelay: '300ms' }}>
          <SLabel>✅ Normalized Transactions ({txns.length} total)</SLabel>
          {txns.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">No transactions were parsed. Check the mapping and raw data above.</div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5 max-h-80 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-indigo-100/50">
                    <th className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">#</th>
                    <th className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Date</th>
                    <th className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Description</th>
                    <th className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Category</th>
                    <th className="text-right py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Debit</th>
                    <th className="text-right py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Credit</th>
                    <th className="text-right py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Balance</th>
                    <th className="text-left py-2 px-2 font-bold text-[9px] uppercase tracking-wider text-gray-400">Txn ID</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t, i) => (
                    <tr key={i} className="border-b border-white/40 hover:bg-white/20 transition-colors">
                      <td className="py-1.5 px-2 text-gray-400 font-mono">{i + 1}</td>
                      <td className="py-1.5 px-2 text-gray-600 whitespace-nowrap">{t.dateStr}</td>
                      <td className="py-1.5 px-2 text-gray-700 font-medium max-w-[250px] truncate" title={t.description}>{t.description || '—'}</td>
                      <td className="py-1.5 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>{t.category}</span>
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-rose-500 whitespace-nowrap">{t.debit > 0 ? fmt(t.debit) : ''}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-emerald-600 whitespace-nowrap">{t.credit > 0 ? fmt(t.credit) : ''}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-800 whitespace-nowrap">{fmt(t.balance)}</td>
                      <td className="py-1.5 px-2 text-gray-500 max-w-[120px] truncate" title={t.txnId}>{t.txnId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GW>

        {/* Bottom action bar */}
        {txns.length > 0 && (
          <div className="flex justify-center animate-rise-in" style={{ animationDelay: '350ms' }}>
            <button onClick={confirmAndProceed}
              className="px-8 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all">
              ✓ Looks Good — Proceed to Dashboard →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Upload State
  if (!loadingSaved && savedStatements.length === 0) {
    return (
      <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans">
        <div className="mb-8 animate-rise-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <FaUniversity size={18} className="text-indigo-500" />
            </div>
            Bank Statement Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-2 ml-[52px]">Upload your bank statement to get instant analytics</p>
        </div>

        <div className="max-w-4xl mx-auto mt-8 animate-rise-in" style={{ animationDelay: '150ms' }}>
          <div className="max-w-2xl mx-auto">
            <GW className="!p-8">
              <CsvAndExcelUploader
                onDataParsed={(data) => {}}
                onFileSelected={(file, data) => handleData(data, file)}
                title="Upload Bank Statement"
                subtitle="Drag & drop your .xlsx, .xls, or .csv bank statement file"
                hint="Supports most Indian bank formats — HDFC, SBI, ICICI, Axis, Kotak, and more. Title rows above headers are auto-detected."
              />
            </GW>

            {parseError && (
              <div className="mt-4 p-4 rounded-2xl animate-rise-in" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="text-sm font-bold text-rose-600 mb-1">⚠️ Could not parse file</div>
                <div className="text-xs text-rose-500 leading-relaxed">{parseError}</div>
                <div className="text-[10px] text-gray-400 mt-2">Tip: Open the browser console (F12) for detailed debug logs.</div>
              </div>
            )}

            <div className="mt-6 glass-water-inner p-4 animate-rise-in" style={{ animationDelay: '300ms' }}>
              <div className="text-[11px] font-bold text-indigo-500 mb-2 uppercase tracking-wider">💡 Supported Formats</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-500">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span><strong>Format A:</strong> Columns with Cr/D indicator + Transaction amount</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span><strong>Format B:</strong> Separate Withdrawal & Deposit columns</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span><strong>Format C:</strong> Separate Debit & Credit columns</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span><strong>Dates:</strong> DD/MM/YYYY, DD-Mon-YYYY, YYYY-MM-DD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Statements Section */}
          <div className="mt-10 animate-rise-in" style={{ animationDelay: '350ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                <FaUniversity size={14} className="text-indigo-500" /> Recent Uploads ({savedStatements.length})
              </h2>
            </div>
            
            {loadingSaved ? (
              <GW className="text-center py-10">
                <div className="text-xs text-gray-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading saved statements...
                </div>
              </GW>
            ) : savedStatements.length === 0 ? (
              <GW className="text-center py-10 text-xs text-gray-400">
                No saved bank statements found. Upload a statement to get started.
              </GW>
            ) : (
              <GW className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-indigo-100/50 bg-white/20">
                        <th className="text-left py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Statement Details</th>
                        <th className="text-center py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Date Range</th>
                        <th className="text-center py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Transactions</th>
                        <th className="text-right py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Credits</th>
                        <th className="text-right py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Debits</th>
                        <th className="text-right py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Net Flow</th>
                        <th className="text-center py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedStatements.map((s) => {
                        const dateRangeStr = s.dateFrom && s.dateTo 
                          ? `${formatDate(new Date(s.dateFrom))} – ${formatDate(new Date(s.dateTo))}`
                          : '—';
                        return (
                          <tr key={s._id} className="border-b border-white/50 hover:bg-white/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-gray-800">
                              <div className="font-bold text-gray-700 truncate max-w-[200px]" title={s.label || s.fileName}>
                                {s.label || s.fileName}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Uploaded: {formatDate(new Date(s.createdAt))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center text-gray-600 font-medium whitespace-nowrap">
                              {dateRangeStr}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-600 font-bold">
                              {s.txnCount}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {fmt(s.totalCredits)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-500 whitespace-nowrap">
                              {fmt(s.totalDebits)}
                            </td>
                            <td className={`py-3 px-4 text-right font-extrabold whitespace-nowrap ${s.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {s.netFlow >= 0 ? '+' : ''}{fmt(s.netFlow)}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => loadSavedStatement(s._id)}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-sm transition-all"
                                >
                                  Analyze
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this statement?')) {
                                      deleteSavedStatement(s._id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50/50 transition-colors"
                                  title="Delete Statement"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GW>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loadingSaved) {
    return (
      <div className="glass-water-bg min-h-full p-4 sm:p-6 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm font-semibold">Loading consolidated database...</p>
        </div>
      </div>
    );
  }

  // Dashboard State
  return (
    <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-rise-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <FaUniversity size={18} className="text-indigo-500" />
            </div>
            Bank Statement Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-[52px]">
            {statementFilterId === 'all' ? 'Consolidated Master' : savedStatements.find(s => s._id === statementFilterId)?.label || 'Filtered View'} · {savedStatements.length} statement files · {transactions.length} transactions {transactions.length > 0 && `· ${transactions[0]?.dateStr} → ${transactions[transactions.length - 1]?.dateStr}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Statement Selector Dropdown */}
          <select
            value={statementFilterId}
            onChange={e => { setStatementFilterId(e.target.value); setPage(1); }}
            className="bg-white/60 border border-white/80 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer mr-1"
          >
            <option value="all">All Uploaded Statements</option>
            {savedStatements.map(s => (
              <option key={s._id} value={s._id}>{s.label || s.fileName}</option>
            ))}
          </select>

          <button
            onClick={() => setShowUploadPanel(!showUploadPanel)}
            className={`glass-water-pill flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all ${showUploadPanel ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-600 hover:text-indigo-600'}`}
          >
            {showUploadPanel ? '✕ Close Uploader' : '➕ Upload Statement'}
          </button>
          
          <button
            onClick={exportCSV}
            className="glass-water-pill flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <FaDownload size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Collapsable Uploader Panel ── */}
      {showUploadPanel && (
        <div className="mb-6 max-w-2xl mx-auto animate-rise-in">
          <GW className="!p-6 relative">
            <button 
              onClick={() => setShowUploadPanel(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-rose-500 transition-colors p-1"
              title="Close"
            >
              <FaTimes size={14} />
            </button>
            <CsvAndExcelUploader
              onDataParsed={(data) => {}}
              onFileSelected={(file, data) => handleData(data, file)}
              title="Upload Additional Bank Statement"
              subtitle="Drag & drop your .xlsx, .xls, or .csv bank statement file"
              hint="The statement transactions will be merged into your master consolidated dashboard."
            />
          </GW>
        </div>
      )}

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {KPIs.map((k, i) => (
          <div key={k.label} 
               className="group relative overflow-hidden bg-white border border-gray-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 animate-rise-in" 
               style={{ animationDelay: `${i * 55}ms` }}
               title={k.sub || ''}>
            {/* Value (Large text top-left) */}
            <div className="text-xl sm:text-2xl font-black text-gray-800 leading-none mb-1">
              {k.value}
            </div>
            
            {/* Label (Small uppercase below value) */}
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {k.label}
            </div>

            {/* Icon (Large transparent on the right) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-[0.10] transition-transform duration-300 group-hover:scale-110">
              <k.icon size={44} style={{ color: k.iconColor }} />
            </div>

            {/* Colored bottom line */}
            <div className="absolute bottom-0 left-0 right-0 h-[5px]" style={{ backgroundColor: k.iconColor }} />
          </div>
        ))}
      </div>

      {/* ── Net Flow Highlight Bar ── */}
      <div className="glass-water-highlight p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-rise-in" style={{ animationDelay: '420ms' }}>
        <div>
          <div className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest mb-1">Net Cash Flow</div>
          <div className={`text-4xl font-black ${stats.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {stats.netFlow >= 0 ? '+' : ''}{fmt(stats.netFlow)}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { l: 'Total Inflow', v: stats.totalCredits, bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', c: '#10b981' },
            { l: 'Total Outflow', v: stats.totalDebits, bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.25)', c: '#ec4899' },
          ].map(m => (
            <div key={m.l} className="rounded-2xl px-4 py-3 text-center" style={{ background: m.bg, border: `1px solid ${m.border}` }}>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: m.c }}>{m.l}</div>
              <div className="text-xl font-extrabold mt-0.5" style={{ color: m.c }}>{fmt(m.v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'transactions', label: '📋 Transactions' },
          { id: 'monthly', label: '📅 Monthly Summary' },
          { id: 'analytics', label: '📈 Analytics' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t.id ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'glass-water-pill text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab === 'overview' && (
        <div className="space-y-5 animate-rise-in">
          {/* Balance Trend */}
          <GW>
            <SLabel>Balance Trend</SLabel>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={fmtCompact} tick={{ fontSize: 10 }} />
                  <Tooltip content={<TTip />} />
                  <Area type="monotone" dataKey="balance" name="Balance" stroke="#6366f1" strokeWidth={2.5} fill="url(#gBal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GW>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Credits vs Debits — Monthly */}
            <GW>
              <SLabel>Credits vs Debits — Monthly</SLabel>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="gCr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="gDr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} /><stop offset="100%" stopColor="#ec4899" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                    <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={fmtCompact} tick={{ fontSize: 10 }} />
                    <Tooltip content={<TTip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                    <Bar dataKey="Credits" fill="url(#gCr)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Debits" fill="url(#gDr)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Line type="monotone" dataKey="Credits" name="Credit Trend" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GW>

            {/* Category Breakdown */}
            <GW>
              <SLabel>Transaction Category Breakdown</SLabel>
              {categoryData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data.</div>
              ) : (
                <div className="flex items-center gap-4 h-56">
                  <ResponsiveContainer width={160} height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={2}>
                        {categoryData.map(c => <Cell key={c.name} fill={c.fill} />)}
                      </Pie>
                      <Tooltip content={<TTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-52 no-scrollbar pr-1">
                    {categoryData.map(c => (
                      <div key={c.name} className="flex items-center justify-between text-xs glass-water-inner px-2.5 py-1.5">
                        <span className="flex items-center gap-2 text-gray-600">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                          <span className="truncate max-w-[100px]">{c.name}</span>
                        </span>
                        <span className="font-bold text-gray-800">{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GW>
          </div>

          {/* Daily Volume */}
          <GW>
            <SLabel>Daily Transaction Volume</SLabel>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<TTip />} />
                  <Bar dataKey="count" name="Transactions" fill="#6366f1" opacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GW>
        </div>
      )}

      {/* ══ MONTHLY SUMMARY ══ */}
      {tab === 'monthly' && (
        <div className="space-y-5 animate-rise-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Average Monthly Expense */}
            <GW>
              <SLabel>Average Monthly Outflow</SLabel>
              <div className="text-2xl font-black text-rose-500">
                {fmt(monthlyStats.reduce((s, m) => s + m.totalDebits, 0) / (monthlyStats.length || 1))}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Calculated over {monthlyStats.length} calendar months</div>
            </GW>
            {/* Average Monthly Inflow */}
            <GW>
              <SLabel>Average Monthly Inflow</SLabel>
              <div className="text-2xl font-black text-emerald-600">
                {fmt(monthlyStats.reduce((s, m) => s + m.totalCredits, 0) / (monthlyStats.length || 1))}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Calculated over {monthlyStats.length} calendar months</div>
            </GW>
            {/* Net Average Monthly Flow */}
            <GW>
              <SLabel>Average Net Monthly Flow</SLabel>
              {(() => {
                const avg = monthlyStats.reduce((s, m) => s + m.netFlow, 0) / (monthlyStats.length || 1);
                return (
                  <>
                    <div className={`text-2xl font-black ${avg >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {avg >= 0 ? '+' : ''}{fmt(avg)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">Average monthly cash delta</div>
                  </>
                );
              })()}
            </GW>
          </div>

          {/* Monthly comparison chart */}
          <GW>
            <SLabel>Monthly Credits vs Debits Trend</SLabel>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                  <XAxis dataKey="monthKey" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={fmtCompact} tick={{ fontSize: 10 }} />
                  <Tooltip content={<TTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                  <Bar dataKey="totalCredits" name="Inflow (Credits)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="totalDebits" name="Outflow (Debits)" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GW>

          {/* Monthly Stats Table */}
          <GW>
            <SLabel>Calendar Months Breakdown</SLabel>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-indigo-100/50">
                    <th className="text-left py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Month</th>
                    <th className="text-center py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Txns</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Opening Balance</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Credits</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Debits</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Net Flow</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Closing Balance</th>
                    <th className="text-center py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Filter</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map(m => (
                    <tr key={m.monthKey} className="border-b border-white/50 hover:bg-white/30 transition-colors">
                      <td className="py-2.5 px-2 font-bold text-gray-700">{m.monthKey}</td>
                      <td className="py-2.5 px-2 text-center text-gray-500 font-semibold">{m.txns.length}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-gray-600">{fmt(m.openingBalance)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-600">{fmt(m.totalCredits)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-rose-500">{fmt(m.totalDebits)}</td>
                      <td className={`py-2.5 px-2 text-right font-extrabold ${m.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {m.netFlow >= 0 ? '+' : ''}{fmt(m.netFlow)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-gray-800">{fmt(m.closingBalance)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => {
                            // Filter transactions tab to this month
                            const pad = (n) => String(n).padStart(2, '0');
                            const firstDate = m.txns[0].date;
                            const lastDate = m.txns[m.txns.length - 1].date;
                            
                            const yFrom = firstDate.getFullYear();
                            const mFrom = pad(firstDate.getMonth() + 1);
                            const dFrom = pad(firstDate.getDate());
                            
                            const yTo = lastDate.getFullYear();
                            const mTo = pad(lastDate.getMonth() + 1);
                            const dTo = pad(lastDate.getDate());

                            setDateFrom(`${yFrom}-${mFrom}-${dFrom}`);
                            setDateTo(`${yTo}-${mTo}-${dTo}`);
                            setTab('transactions');
                            setShowFilters(true);
                          }}
                          className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-[10px] font-bold text-indigo-600 transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GW>
        </div>
      )}

      {/* ══ TRANSACTIONS ══ */}
      {tab === 'transactions' && (
        <div className="animate-rise-in">
          <GW>
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="flex-1 relative w-full">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by description or transaction ID..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-white/60 border border-white/80 text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`glass-water-pill flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${showFilters ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <FaFilter size={11} /> Filters {(dateFrom || dateTo || categoryFilter) && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              </button>
            </div>

            {/* Filter Row */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 glass-water-inner rounded-xl animate-rise-in">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt size={11} className="text-gray-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    className="bg-transparent text-xs text-gray-700 outline-none border-b border-gray-200 pb-0.5"
                    placeholder="From"
                  />
                  <span className="text-gray-300">–</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    className="bg-transparent text-xs text-gray-700 outline-none border-b border-gray-200 pb-0.5"
                    placeholder="To"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs text-gray-700 outline-none border-b border-gray-200 pb-0.5 pr-4"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {(dateFrom || dateTo || categoryFilter) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); setCategoryFilter(''); setPage(1); }}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
                <div className="ml-auto text-[10px] text-gray-400 font-semibold">
                  {filtered.length} of {transactions.length} transactions
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-indigo-100/50">
                    <th className="text-left py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Date</th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Description</th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Category</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Debit</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Credit</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Balance</th>
                    {statementFilterId === 'all' && <th className="text-left py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Statement</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t, i) => (
                    <tr key={i} className="border-b border-white/50 hover:bg-white/30 transition-colors">
                      <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap">{t.dateStr}</td>
                      <td className="py-2.5 px-2 text-gray-700 font-medium max-w-[300px] truncate" title={t.description}>
                        {t.description || '—'}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{
                          background: PALETTE[categories.indexOf(t.category) % PALETTE.length] + '18',
                          color: PALETTE[categories.indexOf(t.category) % PALETTE.length]
                        }}>
                          {t.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-rose-500 whitespace-nowrap">
                        {t.debit > 0 ? fmt(t.debit) : ''}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {t.credit > 0 ? fmt(t.credit) : ''}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-gray-800 whitespace-nowrap">{fmt(t.balance)}</td>
                      {statementFilterId === 'all' && (
                        <td className="py-2.5 px-2 text-gray-500 max-w-[120px] truncate" title={t.statementName}>
                          {t.statementName}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/50">
                <div className="text-[10px] text-gray-400 font-semibold">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white/50 disabled:opacity-30 transition-colors"
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${page === p ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-white/50'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white/50 disabled:opacity-30 transition-colors"
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </GW>
        </div>
      )}

      {/* ══ ANALYTICS ══ */}
      {tab === 'analytics' && (
        <div className="space-y-5 animate-rise-in">
          {/* Top Debits */}
          <GW>
            <SLabel>Top 10 Largest Debits</SLabel>
            <div className="space-y-2">
              {transactions
                .filter(t => t.debit > 0)
                .sort((a, b) => b.debit - a.debit)
                .slice(0, 10)
                .map((t, i) => {
                  const max = transactions.filter(x => x.debit > 0).sort((a, b) => b.debit - a.debit)[0]?.debit || 1;
                  const w = Math.min((t.debit / max) * 100, 100);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-600 flex items-center gap-2 max-w-[60%] truncate">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                          <span className="truncate">{t.description || '—'}</span>
                        </span>
                        <span className="font-bold text-rose-500 flex-shrink-0 ml-2">{fmt(t.debit)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/50 overflow-hidden border border-white/60">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 1) % PALETTE.length]})` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </GW>

          {/* Top Credits */}
          <GW>
            <SLabel>Top 10 Largest Credits</SLabel>
            <div className="space-y-2">
              {transactions
                .filter(t => t.credit > 0)
                .sort((a, b) => b.credit - a.credit)
                .slice(0, 10)
                .map((t, i) => {
                  const max = transactions.filter(x => x.credit > 0).sort((a, b) => b.credit - a.credit)[0]?.credit || 1;
                  const w = Math.min((t.credit / max) * 100, 100);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-600 flex items-center gap-2 max-w-[60%] truncate">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                          <span className="truncate">{t.description || '—'}</span>
                        </span>
                        <span className="font-bold text-emerald-600 flex-shrink-0 ml-2">{fmt(t.credit)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/50 overflow-hidden border border-white/60">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: `linear-gradient(90deg, #10b981, #06b6d4)` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </GW>

          {/* Category-wise Summary Table */}
          <GW>
            <SLabel>Category-wise Summary</SLabel>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-indigo-100/50">
                    <th className="text-left py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Category</th>
                    <th className="text-center py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Count</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Debit</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Credit</th>
                    <th className="text-right py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-gray-400">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => {
                    const catTxns = transactions.filter(t => t.category === cat);
                    const totalD = catTxns.reduce((s, t) => s + t.debit, 0);
                    const totalC = catTxns.reduce((s, t) => s + t.credit, 0);
                    const net = totalC - totalD;
                    return (
                      <tr key={cat} className="border-b border-white/50 hover:bg-white/30 transition-colors">
                        <td className="py-2.5 px-2">
                          <span className="flex items-center gap-2 font-semibold text-gray-700">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            {cat}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-600 font-medium">{catTxns.length}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-rose-500">{totalD > 0 ? fmt(totalD) : '—'}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-emerald-600">{totalC > 0 ? fmt(totalC) : '—'}</td>
                        <td className={`py-2.5 px-2 text-right font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-indigo-100/50">
                    <td className="py-3 px-2 font-extrabold text-gray-800">Total</td>
                    <td className="py-3 px-2 text-center font-bold text-gray-800">{transactions.length}</td>
                    <td className="py-3 px-2 text-right font-extrabold text-rose-500">{fmt(stats.totalDebits)}</td>
                    <td className="py-3 px-2 text-right font-extrabold text-emerald-600">{fmt(stats.totalCredits)}</td>
                    <td className={`py-3 px-2 text-right font-extrabold ${stats.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(stats.netFlow)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </GW>

          {/* Daily Credits vs Debits Area Chart */}
          <GW>
            <SLabel>Daily Credits vs Debits</SLabel>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gDayCr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDayDr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.20} /><stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(99,102,241,0.08)" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={fmtCompact} tick={{ fontSize: 10 }} />
                  <Tooltip content={<TTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                  <Area type="monotone" dataKey="credit" name="Credits" stroke="#10b981" strokeWidth={2} fill="url(#gDayCr)" />
                  <Area type="monotone" dataKey="debit" name="Debits" stroke="#ec4899" strokeWidth={2} fill="url(#gDayDr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GW>
        </div>
      )}
      {/* ── Recent Uploads (Manage Statements) Section ── */}
      <div className="mt-8 animate-rise-in" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
            <FaUniversity size={14} className="text-indigo-500" /> Uploaded Statement Files ({savedStatements.length})
          </h2>
        </div>
        
        {savedStatements.length === 0 ? (
          <GW className="text-center py-6 text-xs text-gray-400">
            No saved bank statements found. Use the uploader above to get started.
          </GW>
        ) : (
          <GW className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-indigo-100/50 bg-white/20">
                    <th className="text-left py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Statement Details</th>
                    <th className="text-center py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Date Range</th>
                    <th className="text-center py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Transactions</th>
                    <th className="text-right py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Credits</th>
                    <th className="text-right py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Total Debits</th>
                    <th className="text-right py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Net Flow</th>
                    <th className="text-center py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedStatements.map((s) => {
                    const dateRangeStr = s.dateFrom && s.dateTo 
                      ? `${formatDate(new Date(s.dateFrom))} – ${formatDate(new Date(s.dateTo))}`
                      : '—';
                    return (
                      <tr key={s._id} className="border-b border-white/50 hover:bg-white/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">
                          <div className="font-bold text-gray-700 truncate max-w-[200px]" title={s.label || s.fileName}>
                            {s.label || s.fileName}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Uploaded: {formatDate(new Date(s.createdAt))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 font-medium whitespace-nowrap">
                          {dateRangeStr}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 font-bold">
                          {s.txnCount}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {fmt(s.totalCredits)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-500 whitespace-nowrap">
                          {fmt(s.totalDebits)}
                        </td>
                        <td className={`py-3 px-4 text-right font-extrabold whitespace-nowrap ${s.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {s.netFlow >= 0 ? '+' : ''}{fmt(s.netFlow)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setStatementFilterId(s._id);
                                setPage(1);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all ${statementFilterId === s._id ? 'text-white bg-indigo-600' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                            >
                              {statementFilterId === s._id ? 'Selected' : 'Filter View'}
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this statement? Deleting will also clean up synced Expense/Income ledger records.')) {
                                  deleteSavedStatement(s._id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50/50 transition-colors"
                              title="Delete Statement"
                            >
                              <FaTimes size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GW>
        )}
      </div>
    </div>
  );
}
