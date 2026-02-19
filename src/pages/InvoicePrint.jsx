import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPrint, FaArrowLeft } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

// ── Helpers ────────────────────────────────────────────────────────────────────
function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n/1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n/100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n/10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };
  return (inWords(Math.floor(num)) + ' Only').trim();
}

const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Style constants ────────────────────────────────────────────────────────────
const NAVY = '#1e3a5f';
const BORDER = '#d1d5db';
const AMBER = '#92400e';
const AMBER_BG = '#fffbeb';

const thStyle = (align = 'left') => ({
  padding: '8px 10px', fontSize: '9px', fontWeight: 700,
  letterSpacing: '0.07em', textTransform: 'uppercase',
  color: '#fff', background: NAVY, textAlign: align,
  borderRight: '1px solid rgba(255,255,255,0.15)',
  whiteSpace: 'nowrap',
});

const tdStyle = (align = 'left') => ({
  padding: '8px 10px', fontSize: '11px', color: '#374151',
  borderBottom: `1px solid ${BORDER}`, textAlign: align,
  verticalAlign: 'top',
});

// ── Main Component ─────────────────────────────────────────────────────────────
const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, settRes] = await Promise.allSettled([
          api.get(`/invoices/${id}`),
          api.get('/settings'),
        ]);
        if (invRes.status === 'fulfilled') setInvoice(invRes.value.data);
        if (settRes.status === 'fulfilled') setSettings(settRes.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  if (loading) {
      return (
        <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '20px 0' }}>
            <div style={{ maxWidth: 900, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="80px" height="36px" />
                <div style={{ display: 'flex', gap: 10 }}>
                    <Skeleton width="100px" height="30px" />
                    <Skeleton width="160px" height="36px" />
                </div>
            </div>
            <div style={{ maxWidth: 900, margin: '0 auto', background: '#fff', padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
                <Skeleton width="100%" height="6px" className="mb-6 rounded" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <Skeleton width="60px" height="60px" className="mb-2" />
                        <Skeleton width="200px" height="24px" className="mb-1" />
                        <Skeleton width="150px" height="14px" className="mb-1" />
                        <Skeleton width="100px" height="14px" />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <Skeleton width="180px" height="32px" className="mb-1 ml-auto" />
                        <Skeleton width="100px" height="16px" className="ml-auto" />
                    </div>
                </div>
                <div style={{ height: 80, background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {[...Array(4)].map((_,i) => <div key={i}><Skeleton width="60px" height="10px" className="mb-1" /><Skeleton width="80px" height="14px" /></div>)}
                     </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                     <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                         <Skeleton width="60px" height="10px" className="mb-2" />
                         <Skeleton width="120px" height="16px" className="mb-1" />
                         <Skeleton width="180px" height="14px" className="mb-1" />
                         <Skeleton width="100px" height="14px" />
                     </div>
                     <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                         <Skeleton width="60px" height="10px" className="mb-2" />
                         <Skeleton width="120px" height="16px" className="mb-1" />
                         <Skeleton width="180px" height="14px" className="mb-1" />
                         <Skeleton width="100px" height="14px" />
                     </div>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                    <div style={{ background: '#1e3a5f', height: 32 }}></div>
                    <div style={{ padding: 10 }}>
                         {[...Array(5)].map((_,i) => <Skeleton key={i} width="100%" height="24px" className="mb-2" />)}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <div style={{ width: 300, border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                         {[...Array(4)].map((_,i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><Skeleton width="80px" height="14px" /><Skeleton width="60px" height="14px" /></div>)}
                         <Skeleton width="100%" height="2px" className="my-2" />
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}><Skeleton width="100px" height="18px" /><Skeleton width="80px" height="18px" /></div>
                     </div>
                </div>
            </div>
        </div>
      );
  }
  if (!invoice) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Invoice not found.</div>;

  const invType = invoice.invoiceType || 'Tax Invoice';
  const hasTax = invType === 'Tax Invoice' || invType === 'Excise Invoice';
  const hasHSN = invType === 'Tax Invoice' || invType === 'Excise Invoice';
  const hasExcise = invType === 'Excise Invoice';
  const isIntraState = !invoice.totalIGST || invoice.totalIGST === 0;

  const company = settings || {};
  const client = invoice.client || {};
  const items = invoice.items || [];
  const exciseDuty = invoice.exciseDuty || {};

  const grandTotal = Number(invoice.grandTotal) || 0;
  const balanceDue = Number(invoice.balanceDue) || 0;
  const advancePaid = Number(invoice.advancePaid) || 0;

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '20px 0' }}>

      {/* ── Screen-only toolbar ── */}
      <div style={{ maxWidth: 900, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        className="print:hidden">
        <button onClick={() => navigate('/invoices')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
          <FaArrowLeft size={15} /> Back
        </button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#fff', padding: '4px 12px', borderRadius: 20, border: `1px solid ${BORDER}` }}>
            {invType}
          </span>
          <button onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <FaPrint size={15} /> Print / Download
          </button>
        </div>
      </div>

      {/* ── A4 Paper ── */}
      <div id="invoice-print" style={{
        maxWidth: 900, margin: '0 auto', background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontFamily: "'Segoe UI', Arial, sans-serif",
        padding: '36px 40px', color: '#1f2937',
      }}>

        {/* ── Top accent bar ── */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${NAVY}, #2563eb)`, marginBottom: 28, borderRadius: 3 }} />

        {/* ── Header: Company + Invoice Title ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            {(company.logoUrl || company.logo) && (
              <img src={company.logoUrl || company.logo} alt="logo" style={{ height: 52, marginBottom: 8, objectFit: 'contain' }} />
            )}
            <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, letterSpacing: '-0.3px' }}>
              {company.companyName || 'Your Company'}
            </div>
            {company.address && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {typeof company.address === 'string'
                  ? company.address
                  : [company.address.line1, company.address.city, company.address.state, company.address.zip].filter(Boolean).join(', ')}
              </div>
            )}
            {company.gstin && <div style={{ fontSize: 11, color: '#6b7280' }}>GSTIN: {company.gstin}</div>}
            {company.phone && <div style={{ fontSize: 11, color: '#6b7280' }}>Ph: {company.phone}</div>}
            {company.email && <div style={{ fontSize: 11, color: '#6b7280' }}>{company.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
              {invType}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {invoice.reverseCharge && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, marginRight: 6 }}>Reverse Charge</span>}
            </div>
          </div>
        </div>

        {/* ── Meta Band ── */}
        <div style={{ background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 16px' }}>
          {[
            ['Invoice No.', invoice.invoiceNo],
            ['Invoice Date', fmtDate(invoice.date)],
            ['Due Date', fmtDate(invoice.dueDate)],
            ['Status', invoice.status || 'DRAFT'],
            invoice.transport?.poNumber ? ['PO Number', invoice.transport.poNumber] : null,
            invoice.transport?.poDate ? ['PO Date', fmtDate(invoice.transport.poDate)] : null,
            hasTax && invoice.placeOfSupply ? ['Place of Supply', invoice.placeOfSupply] : null,
            invoice.paymentMode ? ['Payment Mode', invoice.paymentMode] : null,
          ].filter(Boolean).map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* ── Excise: Manufacturer Details ── */}
        {hasExcise && (exciseDuty.manufacturerName || exciseDuty.rangeCode) && (
          <div style={{ background: AMBER_BG, border: `1px solid #fcd34d`, borderRadius: 8, padding: '10px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Manufacturer / Excise Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px', fontSize: 11, color: '#374151' }}>
              {exciseDuty.manufacturerName && <div><span style={{ color: '#9ca3af', fontSize: 9 }}>MANUFACTURER</span><br />{exciseDuty.manufacturerName}</div>}
              {exciseDuty.manufacturerAddress && <div><span style={{ color: '#9ca3af', fontSize: 9 }}>ADDRESS</span><br />{exciseDuty.manufacturerAddress}</div>}
              {exciseDuty.rangeCode && <div><span style={{ color: '#9ca3af', fontSize: 9 }}>RANGE CODE</span><br />{exciseDuty.rangeCode}</div>}
            </div>
          </div>
        )}

        {/* ── Bill To / Ship To ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bill To</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{client.name}</div>
            {client.address?.line1 && <div style={{ fontSize: 11, color: '#6b7280' }}>{client.address.line1}</div>}
            {client.address?.line2 && <div style={{ fontSize: 11, color: '#6b7280' }}>{client.address.line2}</div>}
            {(client.address?.city || client.address?.state) && (
              <div style={{ fontSize: 11, color: '#6b7280' }}>{[client.address.city, client.address.state, client.address.zip].filter(Boolean).join(', ')}</div>
            )}
            {client.address?.country && <div style={{ fontSize: 11, color: '#6b7280' }}>{client.address.country}</div>}
            {client.gstin && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>GSTIN: <strong>{client.gstin}</strong></div>}
            {client.phone && <div style={{ fontSize: 11, color: '#6b7280' }}>Ph: {client.phone}</div>}
            {client.email && <div style={{ fontSize: 11, color: '#6b7280' }}>{client.email}</div>}
          </div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Ship To</div>
            {invoice.shippingAddress?.line1 ? (
              <>
                <div style={{ fontSize: 11, color: '#374151' }}>{invoice.shippingAddress.line1}</div>
                {invoice.shippingAddress?.line2 && <div style={{ fontSize: 11, color: '#6b7280' }}>{invoice.shippingAddress.line2}</div>}
                <div style={{ fontSize: 11, color: '#6b7280' }}>{[invoice.shippingAddress.city, invoice.shippingAddress.state, invoice.shippingAddress.zip].filter(Boolean).join(', ')}</div>
                {invoice.shippingAddress?.country && <div style={{ fontSize: 11, color: '#6b7280' }}>{invoice.shippingAddress.country}</div>}
              </>
            ) : (
              <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Same as billing address</div>
            )}
          </div>
        </div>

        {/* ── Items Table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr>
              <th style={thStyle('center')}>#</th>
              <th style={thStyle()}>Item / Description</th>
              {hasHSN && <th style={thStyle('center')}>HSN/SAC</th>}
              <th style={thStyle('center')}>Unit</th>
              <th style={thStyle('right')}>Qty</th>
              <th style={thStyle('right')}>Price</th>
              <th style={thStyle('right')}>Disc%</th>
              {hasTax && <th style={thStyle('right')}>Taxable</th>}
              {hasTax && isIntraState && <th style={thStyle('right')}>CGST</th>}
              {hasTax && isIntraState && <th style={thStyle('right')}>SGST</th>}
              {hasTax && !isIntraState && <th style={thStyle('right')}>IGST</th>}
              {hasExcise && <th style={thStyle('right')}>Excise</th>}
              <th style={thStyle('right')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const qty = Number(item.qty) || 0;
              const rate = Number(item.rate) || 0;
              const discPct = Number(item.discount) || 0;
              const taxable = qty * rate * (1 - discPct / 100);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={tdStyle('center')}>{i + 1}</td>
                  <td style={tdStyle()}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{item.description}</div>}
                  </td>
                  {hasHSN && <td style={tdStyle('center')}>{item.hsnCode || '—'}</td>}
                  <td style={tdStyle('center')}>{item.unit || 'pcs'}</td>
                  <td style={tdStyle('right')}>{qty}</td>
                  <td style={tdStyle('right')}>₹{fmt(rate)}</td>
                  <td style={tdStyle('right')}>{discPct > 0 ? `${discPct}%` : '—'}</td>
                  {hasTax && <td style={tdStyle('right')}>₹{fmt(taxable)}</td>}
                  {hasTax && isIntraState && <td style={tdStyle('right')}>₹{fmt(item.cgst)}<br /><span style={{ fontSize: 9, color: '#9ca3af' }}>{item.taxRate ? item.taxRate/2 : 0}%</span></td>}
                  {hasTax && isIntraState && <td style={tdStyle('right')}>₹{fmt(item.sgst)}<br /><span style={{ fontSize: 9, color: '#9ca3af' }}>{item.taxRate ? item.taxRate/2 : 0}%</span></td>}
                  {hasTax && !isIntraState && <td style={tdStyle('right')}>₹{fmt(item.igst)}<br /><span style={{ fontSize: 9, color: '#9ca3af' }}>{item.taxRate || 0}%</span></td>}
                  {hasExcise && <td style={tdStyle('right')}>₹{fmt(item.exciseAmount)}<br /><span style={{ fontSize: 9, color: '#9ca3af' }}>BED {item.bedPercent}%</span></td>}
                  <td style={{ ...tdStyle('right'), fontWeight: 600 }}>₹{fmt(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Footer: Amount in Words + Totals ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>

          {/* Amount in Words */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Amount in Words</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontStyle: 'italic' }}>
              Rupees {numberToWords(Math.round(grandTotal))}
            </div>
            {invoice.terms && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Terms &amp; Conditions</div>
                <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{invoice.terms}</div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px' }}>
            {[
              ['Subtotal', invoice.subTotal],
              hasTax && isIntraState && invoice.totalCGST > 0 ? ['CGST', invoice.totalCGST] : null,
              hasTax && isIntraState && invoice.totalSGST > 0 ? ['SGST', invoice.totalSGST] : null,
              hasTax && !isIntraState && invoice.totalIGST > 0 ? ['IGST', invoice.totalIGST] : null,
              hasExcise && exciseDuty.totalExcise > 0 ? ['Excise Duty', exciseDuty.totalExcise] : null,
              invoice.shippingCharges > 0 ? ['Shipping', invoice.shippingCharges] : null,
              invoice.packagingCharges > 0 ? [invoice.customChargeLabel || 'Custom', invoice.packagingCharges] : null,
              invoice.discountTotal > 0 ? ['Discount', -invoice.discountTotal] : null,
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                <span>{label}</span>
                <span style={{ color: Number(val) < 0 ? '#ef4444' : '#374151' }}>
                  {Number(val) < 0 ? '-' : ''}₹{fmt(Math.abs(Number(val)))}
                </span>
              </div>
            ))}

            <div style={{ borderTop: `2px solid ${NAVY}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>Grand Total</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>₹{fmt(grandTotal)}</span>
            </div>

            {advancePaid > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#059669', marginTop: 6 }}>
                  <span>Advance Paid</span><span>- ₹{fmt(advancePaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                  <span>Balance Due</span><span>₹{fmt(balanceDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Bank Details + Signature ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {(company.bankName || company.accountNumber) && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bank Details</div>
              {company.bankName && <div style={{ fontSize: 11, color: '#374151' }}>Bank: <strong>{company.bankName}</strong></div>}
              {company.accountName && <div style={{ fontSize: 11, color: '#374151' }}>A/C Name: {company.accountName}</div>}
              {company.accountNumber && <div style={{ fontSize: 11, color: '#374151' }}>A/C No.: {company.accountNumber}</div>}
              {company.ifscCode && <div style={{ fontSize: 11, color: '#374151' }}>IFSC: {company.ifscCode}</div>}
            </div>
          )}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 16px', textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>For {company.companyName || 'Company'}</div>
            <div style={{ height: 44 }} />
            <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: 6, fontSize: 10, color: '#6b7280' }}>Authorised Signatory</div>
          </div>
        </div>

        {/* ── Bottom accent ── */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${NAVY}, #2563eb)`, borderRadius: 3 }} />
        <div style={{ textAlign: 'center', fontSize: 9, color: '#9ca3af', marginTop: 8 }}>
          This is a computer-generated {invType}. No signature required.
        </div>
      </div>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          body { margin: 0; background: #fff; }
          .print\\:hidden { display: none !important; }
          #invoice-print { box-shadow: none !important; max-width: 100% !important; padding: 20px !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
};

export default InvoicePrint;
