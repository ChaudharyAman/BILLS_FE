import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPrint, FaArrowLeft } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

// ── Helpers ─────────────────────────────────────────────────────
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
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')} - ${dt.toLocaleString('en-IN',{month:'short'})} - ${dt.getFullYear()}`;
};

// ── Color palette ─────────────────────────────────────────────────
const TEAL   = '#1e5f78';
const TEXT   = '#1a1a1a';
const MUTED  = '#555';
const BORDER = '#d0d0d0';

// ── Style helpers ────────────────────────────────────────────────
function TH(align, width) {
  return {
    padding: '7px 8px',
    background: TEAL,
    color: '#fff',
    fontWeight: 700,
    fontSize: 11,
    textAlign: align,
    width: width || undefined,
    whiteSpace: 'pre-line',
    lineHeight: 1.3,
    borderRight: '1px solid rgba(255,255,255,0.18)',
  };
}

function TD(align, noWrap = false) {
  return {
    padding: '7px 8px',
    textAlign: align,
    verticalAlign: 'top',
    borderBottom: `1px solid ${BORDER}`,
    color: TEXT,
    ...(noWrap ? {} : { whiteSpace: 'nowrap' }),
  };
}

const SummaryRow = ({ label, value, green, red }) => (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', gap:12,
    color: green ? '#059669' : red ? '#dc2626' : TEXT }}>
    <b style={{ whiteSpace:'nowrap', color: green ? '#059669' : red ? '#dc2626' : TEXT }}>{label}</b>
    <span style={{ textAlign:'right' }}>{value}</span>
  </div>
);

// ── Main Component ───────────────────────────────────────────────
const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice]   = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [invRes, settRes] = await Promise.allSettled([
          api.get(`/invoices/${id}`),
          api.get('/settings'),
        ]);
        if (invRes.status  === 'fulfilled') setInvoice(invRes.value.data);
        if (settRes.status === 'fulfilled') setSettings(settRes.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    if (invoice) document.title = `${invoice.invoiceNo} – ${invoice.client?.name || 'Invoice'}`;
    return () => { document.title = 'MyBill'; };
  }, [invoice]);

  if (loading) return (
    <div style={{ background: '#eee', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', background: '#fff', padding: '40px' }}>
        {[...Array(6)].map((_,i) => <Skeleton key={i} width="100%" height="28px" className="mb-3" />)}
      </div>
    </div>
  );

  if (!invoice) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#e00' }}>Invoice not found.</div>
  );

  // ── Data ────────────────────────────────────────────────────────
  const company     = settings || {};
  const client      = invoice.client || {};
  const bank        = invoice.bankDetails || {}; // FIX #3: read from invoice, not settings
  const items       = invoice.items  || [];
  const invType     = invoice.invoiceType || 'Tax Invoice';
  const hasExcise   = invType === 'Excise Invoice';
  const isIntra     = !invoice.totalIGST || invoice.totalIGST === 0;

  // Show tax cols only if there is any actual tax amount applied
  const hasTax = (Number(invoice.totalCGST) > 0) || (Number(invoice.totalSGST) > 0) || (Number(invoice.totalIGST) > 0)
    || items.some(it => Number(it.cgst) > 0 || Number(it.sgst) > 0 || Number(it.igst) > 0 || Number(it.taxRate) > 0);
  const hasDiscount = items.some(it => Number(it.discount) > 0);

  const grandTotal  = Number(invoice.grandTotal)  || 0;
  const balanceDue  = Number(invoice.balanceDue)  || 0;
  const advancePaid = Number(invoice.advancePaid) || 0;
  const rounded     = Math.round(grandTotal) - grandTotal;
  const taxRate     = items[0]?.taxRate || 0;

  // Address helpers
  const addrStr = (a) => {
    if (!a) return null;
    if (typeof a === 'string') return a;
    return [a.line1, a.line2, [a.city, a.state ? `(${a.state})` : null, a.zip].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ');
  };

  const companyAddr = addrStr(company.address);
  const clientAddr  = addrStr(client.address);
  const shipAddr    = invoice.shippingAddress?.line1 ? addrStr(invoice.shippingAddress) : clientAddr;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ background: '#eee', minHeight: '100vh', padding: '20px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* Screen toolbar */}
      <div style={{ maxWidth: 860, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between' }}
        className="print:hidden">
        <button onClick={() => navigate('/invoices')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:`1px solid ${BORDER}`, borderRadius:6, background:'#fff', cursor:'pointer', fontSize:13, color:'#333' }}>
          <FaArrowLeft size={13}/> Back
        </button>
        <button onClick={() => window.print()}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 20px', background:TEAL, color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:700 }}>
          <FaPrint size={13}/> Print / Download
        </button>
      </div>

      {/* ══════════════ A4 WHITE SHEET ══════════════ */}
      <div id="invoice-print" style={{
        maxWidth: 860, margin: '0 auto', background: '#fff',
        boxShadow: '0 2px 20px rgba(0,0,0,0.12)',
        padding: '32px 36px 36px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 12, color: TEXT,
      }}>

        {/* ── ROW 1: Logo+Company (left) | Invoice Title (right) ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 20 }}>

          {/* LEFT: logo + company details */}
          <div style={{ width: '50%' }}>
            {(company.logoUrl || company.logo) && (
              <img src={company.logoUrl || company.logo} alt="logo"
                style={{ maxHeight:55, maxWidth:180, objectFit:'contain', marginBottom:10, display:'block' }}/>
            )}
            <div style={{ fontWeight:700, fontSize:14, color: TEAL, marginBottom:4 }}>
              {company.companyName}
            </div>
            <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
              {companyAddr && <div>{companyAddr}</div>}
              {company.phone && <div>{company.phone}</div>}
              {company.email && <div>{company.email}</div>}
              {(company.gstin || company.website) && (
                <div>
                  {company.gstin  && <><b>GSTIN:</b> {company.gstin}&nbsp;&nbsp;</>}
                  {company.website && <><b>Website:</b> {company.website}</>}
                </div>
              )}
              {company.contactName && <div><b>Contact Name:</b> {company.contactName}</div>}
            </div>
          </div>

          {/* RIGHT: TAX INVOICE + #no + Amount bar + meta */}
          <div style={{ width: '48%' }}>
            {/* Original for recipient */}
            <div style={{ textAlign:'right', fontSize:11, color: MUTED, marginBottom:4, fontStyle:'italic' }}>
              Original for recipient
            </div>

            {/* TAX INVOICE   #58 */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <div style={{ fontSize:22, fontWeight:800, color: TEAL, letterSpacing:'-0.5px' }}>
                {invType.toUpperCase()}
              </div>
              <div style={{ fontSize:22, fontWeight:800, color: TEAL }}>
                #{invoice.invoiceNo?.replace(/^INV-/,'') || invoice.invoiceNo}
              </div>
            </div>

            {/* Status Stamp */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 12 }}>
              <div style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                border: `1px solid ${balanceDue <= 0 ? '#10b981' : (invoice.status === 'DRAFT' ? '#9ca3af' : '#3b82f6')}`,
                color: balanceDue <= 0 ? '#059669' : (invoice.status === 'DRAFT' ? '#6b7280' : '#2563eb'),
                background: balanceDue <= 0 ? '#ecfdf5' : (invoice.status === 'DRAFT' ? '#f3f4f6' : '#eff6ff')
              }}>
                {balanceDue <= 0 ? 'PAID' : (invoice.status || 'SENT')}
              </div>
            </div>

            {/* Amount Due bar */}
            <div style={{
              background: TEAL, color:'#fff',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'6px 12px', fontWeight:700, fontSize:13, marginBottom:16,
            }}>
              <span>Amount Due:</span>
              <span>₹ {fmt(advancePaid > 0 ? balanceDue : grandTotal)}</span>
            </div>

            {/* Meta: right-label + right-value grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:4, fontSize:11 }}>
              {[
                ['Issue Date:',       fmtDate(invoice.date)],
                ['Due Date:',         fmtDate(invoice.dueDate)],
                invoice.transport?.poNumber ? ['PO Number:', invoice.transport.poNumber]       : null,
                invoice.transport?.poDate   ? ['PO Date:',   fmtDate(invoice.transport.poDate)] : null,
                invoice.placeOfSupply       ? ['Place of Supply:', invoice.placeOfSupply]       : null,
                invoice.paymentMode         ? ['Payment Mode:',    invoice.paymentMode]         : null,
              ].filter(Boolean).map(([lbl, val]) => (
                <React.Fragment key={lbl}>
                  <div style={{ textAlign:'right', color: MUTED, paddingRight:12 }}>{lbl}</div>
                  <div style={{ textAlign:'right', color: TEXT }}>{val}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Bill To | Ship To ── */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ width:'48%' }}>
            <div style={{ fontSize:11, fontWeight:700, color: TEXT, marginBottom:2 }}>Bill To</div>
            <div style={{ fontSize:13, fontWeight:700, color: TEAL, marginBottom:2 }}>{client.name}</div>
            <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
              {clientAddr && <div>{clientAddr}</div>}
              {client.gstin && <div><b>GSTIN:</b> {client.gstin}</div>}
              {client.phone && <div>Ph: {client.phone}</div>}
              {client.email && <div>{client.email}</div>}
            </div>
          </div>
          <div style={{ width:'48%' }}>
            <div style={{ fontSize:11, fontWeight:700, color: TEXT, marginBottom:2 }}>Ship To</div>
            <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
              {shipAddr || 'Same as billing address'}
            </div>
          </div>
        </div>

        {/* ══ TABLE ══ */}
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, marginBottom:0 }}>
          <thead>
            <tr>
              <th style={TH('center','4%')}>S.No</th>
              <th style={TH('left', '24%')}>Item{'\n'}Description</th>
              <th style={TH('center','10%')}>HSN/SAC</th>
              <th style={TH('center','8%')}>QTY</th>
              <th style={TH('right','10%')}>{'Price\n(₹)'}</th>
              {hasDiscount && <th style={TH('right', '8%')}>{'Discount\n(%)'}</th>}
              {hasTax && <th style={TH('right','12%')}>{'Taxable\nValue (₹)'}</th>}
              {hasTax && isIntra  && <th style={TH('right','10%')}>{'CGST\n(₹)'}</th>}
              {hasTax && isIntra  && <th style={TH('right','10%')}>{'SGST\n(₹)'}</th>}
              {hasTax && !isIntra && <th style={TH('right','10%')}>{'IGST\n(₹)'}</th>}
              {hasExcise && <th style={TH('right','8%')}>{'Excise\n(₹)'}</th>}
              <th style={{ ...TH('right','12%'), borderRight:'none' }}>{'Amount\n(₹)'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const qty     = Number(item.qty)      || 0;
              const rate    = Number(item.rate)     || 0;
              const discPct = Number(item.discount) || 0;
              const taxable = qty * rate * (1 - discPct / 100);
              const cgstAmt = Number(item.cgst) || 0;
              const sgstAmt = Number(item.sgst) || 0;
              const igstAmt = Number(item.igst) || 0;
              const cgstR   = item.taxRate ? item.taxRate / 2 : 0;
              const rowBg   = i % 2 === 0 ? '#fff' : '#f8f8f8';
              return (
                <tr key={i} style={{ background: rowBg }}>
                  <td style={TD('center')}>{i + 1}</td>
                  <td style={TD('left', true)}>
                    <div style={{ fontWeight:700, color: TEAL }}>{item.name}</div>
                    {item.description && (
                      <div style={{ color: MUTED, fontSize:10, marginTop:1, whiteSpace:'pre-wrap' }}>{item.description}</div>
                    )}
                  </td>
                  <td style={TD('center')}>{item.hsnCode || ''}</td>
                  <td style={TD('center')}>
                    {qty}
                    {item.unit && <><br/><span style={{ fontSize:9, color: MUTED }}>{item.unit}</span></>}
                  </td>
                  <td style={TD('right')}>{fmt(rate)}</td>
                  {hasDiscount && <td style={TD('right')}>{discPct > 0 ? `${discPct}%` : ''}</td>}
                  {hasTax && <td style={TD('right')}>{fmt(taxable)}</td>}
                  {hasTax && isIntra && (
                    <td style={TD('right')}>
                      {fmt(cgstAmt)}
                      {cgstR > 0 && <><br/><span style={{ fontSize:9, color: MUTED }}>{cgstR}%</span></>}
                    </td>
                  )}
                  {hasTax && isIntra && (
                    <td style={TD('right')}>
                      {fmt(sgstAmt)}
                      {cgstR > 0 && <><br/><span style={{ fontSize:9, color: MUTED }}>{cgstR}%</span></>}
                    </td>
                  )}
                  {hasTax && !isIntra && (
                    <td style={TD('right')}>
                      {fmt(igstAmt)}
                      {item.taxRate > 0 && <><br/><span style={{ fontSize:9, color: MUTED }}>{item.taxRate}%</span></>}
                    </td>
                  )}
                  {hasExcise && (
                    <td style={TD('right')}>
                      {fmt(item.exciseAmount)}<br/>
                      <span style={{ fontSize:9, color: MUTED }}>BED {item.bedPercent}%</span>
                    </td>
                  )}
                  <td style={{ ...TD('right'), fontWeight:700 }}>{fmt(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>

          {/* ── Total footer row ── */}
          <tfoot>
            <tr style={{ background:'#eef5f8' }}>
              <td colSpan={5 + (hasDiscount ? 1 : 0)} style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, fontSize:11, color: TEXT, borderTop:`2px solid ${TEAL}` }}>
                Total {taxRate > 0 ? `@${taxRate}%` : ''}
              </td>
              {hasTax && (
                <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, borderTop:`2px solid ${TEAL}` }}>
                  {fmt(invoice.subTotal)}
                </td>
              )}
              {hasTax && isIntra && (
                <>
                  <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, borderTop:`2px solid ${TEAL}` }}>
                    {fmt(invoice.totalCGST)}
                  </td>
                  <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, borderTop:`2px solid ${TEAL}` }}>
                    {fmt(invoice.totalSGST)}
                  </td>
                </>
              )}
              {hasTax && !isIntra && (
                <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, borderTop:`2px solid ${TEAL}` }}>
                  {fmt(invoice.totalIGST)}
                </td>
              )}
              {hasExcise && (
                <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, borderTop:`2px solid ${TEAL}` }}>
                  {fmt(invoice.exciseDuty?.totalExcise)}
                </td>
              )}
              <td style={{ padding:'7px 8px', textAlign:'right', fontWeight:700, borderTop:`2px solid ${TEAL}` }}>
                {fmt(invoice.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Thin divider ── */}
        <div style={{ borderTop:`1px solid ${BORDER}`, margin:'0 0 12px' }}/>

        {/* ── ROW 3: Bank details (left) | Summary (right) ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:4 }}>

          {/* LEFT: Bank Details — read from invoice.bankDetails (fix #3) */}
          <div style={{ width:'44%', fontSize:11, lineHeight:1.8, color: TEXT }}>
            {bank.accountName   && <div><b>Account Holder Name:</b> {bank.accountName.toUpperCase()}</div>}
            {bank.bankName      && <div><b>Bank Name:</b> {bank.bankName.toUpperCase()}</div>}
            {bank.accountNumber && <div><b>Account Number:</b> {bank.accountNumber}</div>}
            {bank.branch        && <div><b>Branch Name:</b> {bank.branch.toUpperCase()}</div>}
            {bank.ifscCode      && <div><b>IFSC Code:</b> {bank.ifscCode}</div>}
            {invoice.terms && (
              <div style={{ marginTop:10, fontSize:10, color: MUTED }}>
                <b style={{ color: TEXT }}>Terms &amp; Conditions:</b><br/>
                <span style={{ whiteSpace:'pre-wrap' }}>{invoice.terms}</span>
              </div>
            )}
            {invoice.notes && (
              <div style={{ marginTop:6, fontSize:10, color: MUTED }}>
                <b style={{ color: TEXT }}>Notes:</b><br/>{invoice.notes}
              </div>
            )}
          </div>

          {/* RIGHT: Totals Summary */}
          <div style={{ width:'52%', fontSize:12 }}>
            <SummaryRow label="Total Taxable Value"    value={`₹ ${fmt(invoice.subTotal)}`} />
            {invoice.shippingCharges > 0 && <SummaryRow label="Shipping Charges" value={`(+) ₹ ${fmt(invoice.shippingCharges)}`} />}
            {invoice.packagingCharges > 0 && <SummaryRow label={invoice.customChargeLabel || 'Custom Charge'} value={`(+) ₹ ${fmt(invoice.packagingCharges)}`} />}
            {invoice.discountTotal > 0 && <SummaryRow label="Discount" value={`(-) ₹ ${fmt(invoice.discountTotal)}`} />}
            {Math.abs(rounded) >= 0.005 && <SummaryRow label="Rounded Off" value={`(-) ₹ ${fmt(Math.abs(rounded))}`} />}
            <SummaryRow label="Total Value (in figure)"  value={`₹ ${fmt(Math.round(grandTotal))}`} />
            {advancePaid > 0 && <SummaryRow label="Advance Paid"  value={`(-) ₹ ${fmt(advancePaid)}`} green />}
            {advancePaid > 0 && <SummaryRow label="Balance Due"   value={`₹ ${fmt(balanceDue)}`}    red />}
            <SummaryRow label="Total Value (in words)"
              value={`₹ ${numberToWords(Math.round(grandTotal))}`} />
            
            {/* Signature Area */}
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'center' }}>
              <div style={{ minHeight: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {(company.signatureUrl || company.signature) ? (
                  <img 
                    src={company.signatureUrl || company.signature} 
                    alt="Signature" 
                    style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ height: 60 }}></div> /* Placeholder space if no signature */
                )}
              </div>
              
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: MUTED, borderTop: `1px solid ${MUTED}`, paddingTop: 4, width: 180 }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

      </div>{/* end A4 */}

      <style>{`
        @media print {
          body { background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          .print\\:hidden { display:none !important; }
          #invoice-print { box-shadow:none !important; }
          @page { size:A4; margin:0; }
        }
      `}</style>
    </div>
  );
};

export default InvoicePrint;
