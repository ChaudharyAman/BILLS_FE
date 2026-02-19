import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Printer, ArrowLeft, ArrowRight } from 'lucide-react';

// docType: 'quote' | 'proforma'
const QuotePrint = ({ docType = 'quote' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isProforma = docType === 'proforma';

  const apiBase = isProforma ? '/proformas' : '/quotes';
  const listPath = isProforma ? '/proformas' : '/quotes';
  const docLabel = isProforma ? 'PROFORMA INVOICE' : 'QUOTATION';
  const docColor = isProforma ? '#1e5f3a' : '#1e3a5f';

  const [doc, setDoc] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, settRes] = await Promise.allSettled([
          api.get(`${apiBase}/${id}`),
          api.get('/settings'),
        ]);
        if (docRes.status === 'fulfilled') setDoc(docRes.value.data);
        if (settRes.status === 'fulfilled') setSettings(settRes.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleConvert = async () => {
    if (!window.confirm(`Convert this ${isProforma ? 'Proforma' : 'Quote'} to an Invoice?`)) return;
    setConverting(true);
    try {
      const res = await api.post(`${apiBase}/${id}/convert`);
      alert(`Invoice ${res.data.invoice.invoiceNo} created!`);
      navigate(`/invoices/${res.data.invoice._id}/print`);
    } catch (e) {
      alert(e.response?.data?.message || 'Conversion failed');
    } finally { setConverting(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;
  if (!doc) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Document not found.</div>;

  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const company = settings || {};
  const client = doc.client || {};
  const items = doc.items || [];
  const hasTax = ['Tax Invoice', 'Excise Invoice'].includes(doc.invoiceType);
  const isIntraState = !doc.totalIGST || doc.totalIGST === 0;
  const BORDER = '#d1d5db';

  const thStyle = (align = 'left') => ({
    padding: '8px 10px', fontSize: '9px', fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase',
    color: '#fff', background: docColor, textAlign: align,
    whiteSpace: 'nowrap',
  });
  const tdStyle = (align = 'left') => ({
    padding: '8px 10px', fontSize: '11px', color: '#374151',
    borderBottom: `1px solid ${BORDER}`, textAlign: align, verticalAlign: 'top',
  });

  const STATUS_COLORS = {
    DRAFT: '#6b7280', SENT: '#2563eb', ACCEPTED: '#059669',
    REJECTED: '#dc2626', CONVERTED: '#7c3aed', CONFIRMED: '#059669',
  };

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '20px 0' }}>

      {/* Screen toolbar */}
      <div style={{ maxWidth: 900, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        className="print:hidden">
        <button onClick={() => navigate(listPath)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
          <ArrowLeft size={15} /> Back
        </button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {doc.status !== 'CONVERTED' && (
            <button onClick={handleConvert} disabled={converting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <ArrowRight size={15} /> Convert to Invoice
            </button>
          )}
          <button onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: docColor, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Printer size={15} /> Print / Download
          </button>
        </div>
      </div>

      {/* A4 Paper */}
      <div id="doc-print" style={{
        maxWidth: 900, margin: '0 auto', background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontFamily: "'Segoe UI', Arial, sans-serif",
        padding: '36px 40px', color: '#1f2937',
      }}>
        {/* Top accent */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${docColor}, #2563eb)`, marginBottom: 28, borderRadius: 3 }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            {(company.logoUrl || company.logo) && <img src={company.logoUrl || company.logo} alt="logo" style={{ height: 52, marginBottom: 8, objectFit: 'contain' }} />}
            <div style={{ fontSize: 20, fontWeight: 800, color: docColor }}>{company.companyName || 'Your Company'}</div>
            {company.address && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {typeof company.address === 'string'
                  ? company.address
                  : [company.address.line1, company.address.city, company.address.state, company.address.zip].filter(Boolean).join(', ')}
              </div>
            )}
            {company.gstin && <div style={{ fontSize: 11, color: '#6b7280' }}>GSTIN: {company.gstin}</div>}
            {company.phone && <div style={{ fontSize: 11, color: '#6b7280' }}>Ph: {company.phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: docColor, textTransform: 'uppercase' }}>{docLabel}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 11, background: STATUS_COLORS[doc.status] + '20', color: STATUS_COLORS[doc.status], padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>
                {doc.status}
              </span>
            </div>
          </div>
        </div>

        {/* Meta Band */}
        <div style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 16px' }}>
          {[
            ['Document No.', isProforma ? doc.proformaNo : doc.quoteNo],
            ['Date', fmtDate(doc.date)],
            ['Valid Until', fmtDate(doc.validUntil)],
            doc.placeOfSupply ? ['Place of Supply', doc.placeOfSupply] : null,
            doc.paymentMode ? ['Payment Mode', doc.paymentMode] : null,
            doc.paymentTerms ? ['Payment Terms', doc.paymentTerms] : null,
          ].filter(Boolean).map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Bill To */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24, maxWidth: '50%' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bill To</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{client.name}</div>
          {client.address?.line1 && <div style={{ fontSize: 11, color: '#6b7280' }}>{client.address.line1}</div>}
          {(client.address?.city || client.address?.state) && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>{[client.address.city, client.address.state, client.address.zip].filter(Boolean).join(', ')}</div>
          )}
          {client.gstin && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>GSTIN: <strong>{client.gstin}</strong></div>}
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={thStyle('center')}>#</th>
              <th style={thStyle()}>Item / Description</th>
              {hasTax && <th style={thStyle('center')}>HSN/SAC</th>}
              <th style={thStyle('center')}>Unit</th>
              <th style={thStyle('right')}>Qty</th>
              <th style={thStyle('right')}>Rate</th>
              <th style={thStyle('right')}>Disc%</th>
              {hasTax && isIntraState && <th style={thStyle('right')}>CGST</th>}
              {hasTax && isIntraState && <th style={thStyle('right')}>SGST</th>}
              {hasTax && !isIntraState && <th style={thStyle('right')}>IGST</th>}
              <th style={thStyle('right')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={tdStyle('center')}>{i + 1}</td>
                <td style={tdStyle()}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{item.name}</div>
                  {item.description && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{item.description}</div>}
                </td>
                {hasTax && <td style={tdStyle('center')}>{item.hsnCode || '—'}</td>}
                <td style={tdStyle('center')}>{item.unit || 'pcs'}</td>
                <td style={tdStyle('right')}>{item.qty}</td>
                <td style={tdStyle('right')}>₹{fmt(item.rate)}</td>
                <td style={tdStyle('right')}>{item.discount > 0 ? `${item.discount}%` : '—'}</td>
                {hasTax && isIntraState && <td style={tdStyle('right')}>₹{fmt(item.cgst)}</td>}
                {hasTax && isIntraState && <td style={tdStyle('right')}>₹{fmt(item.sgst)}</td>}
                {hasTax && !isIntraState && <td style={tdStyle('right')}>₹{fmt(item.igst)}</td>}
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>₹{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 24 }}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
            {doc.notes && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 11, color: '#374151' }}>{doc.notes}</div>
              </div>
            )}
            {doc.terms && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Terms & Conditions</div>
                <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{doc.terms}</div>
              </div>
            )}
            {!doc.notes && !doc.terms && (
              <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>No notes or terms specified.</div>
            )}
          </div>

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
            {[
              ['Subtotal', doc.subTotal],
              hasTax && isIntraState && doc.totalCGST > 0 ? ['CGST', doc.totalCGST] : null,
              hasTax && isIntraState && doc.totalSGST > 0 ? ['SGST', doc.totalSGST] : null,
              hasTax && !isIntraState && doc.totalIGST > 0 ? ['IGST', doc.totalIGST] : null,
              doc.shippingCharges > 0 ? ['Shipping', doc.shippingCharges] : null,
              doc.discountTotal > 0 ? ['Discount', -doc.discountTotal] : null,
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                <span>{label}</span>
                <span style={{ color: Number(val) < 0 ? '#ef4444' : '#374151' }}>
                  {Number(val) < 0 ? '-' : ''}₹{fmt(Math.abs(Number(val)))}
                </span>
              </div>
            ))}
            <div style={{ borderTop: `2px solid ${docColor}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: docColor }}>Grand Total</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: docColor }}>₹{fmt(doc.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', textAlign: 'right', minWidth: 200 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>For {company.companyName || 'Company'}</div>
            <div style={{ height: 44 }} />
            <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: 6, fontSize: 10, color: '#6b7280' }}>Authorised Signatory</div>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${docColor}, #2563eb)`, borderRadius: 3 }} />
        <div style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', marginTop: 8 }}>
          This is a computer-generated {docLabel}. {isProforma ? 'This is not a tax invoice.' : 'Subject to acceptance.'}
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; background: #fff; }
          .print\\:hidden { display: none !important; }
          #doc-print { box-shadow: none !important; max-width: 100% !important; padding: 20px !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
};

export default QuotePrint;
