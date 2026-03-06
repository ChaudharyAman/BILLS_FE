import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPrint, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
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

const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')} - ${dt.toLocaleString('en-IN',{month:'short'})} - ${dt.getFullYear()}`;
};

const TEAL   = '#1e5f78';
const TEXT   = '#1a1a1a';
const MUTED  = '#555';
const BORDER = '#d0d0d0';

function TH(align, width) {
  return { padding:'7px 8px', background: TEAL, color:'#fff', fontWeight:700, fontSize:11,
    textAlign:align, width:width||undefined, whiteSpace:'pre-line', lineHeight:1.3,
    borderRight:'1px solid rgba(255,255,255,0.18)' };
}
function TD(align) {
  return { padding:'7px 8px', textAlign:align, verticalAlign:'top',
    borderBottom:`1px solid ${BORDER}`, color: TEXT };
}

const PurchaseOrderPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc]           = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [docRes, settRes] = await Promise.allSettled([
          api.get(`/purchase-orders/${id}`),
          api.get('/settings'),
        ]);
        if (docRes.status  === 'fulfilled') setDoc(docRes.value.data);
        if (settRes.status === 'fulfilled') setSettings(settRes.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    if (doc) document.title = `${doc.poNumber||'PO'} – ${doc.vendor?.name||'Vendor'}`;
    return () => { document.title = 'MyBill'; };
  }, [doc]);

  const handleConvert = async () => {
    if (!window.confirm('Convert this Purchase Order to an Invoice?')) return;
    setConverting(true);
    try {
      const res = await api.post(`/purchase-orders/${id}/convert`);
      alert(`Invoice ${res.data.invoice.invoiceNo} created!`);
      navigate(`/invoices/${res.data.invoice._id}/print`);
    } catch (e) { alert(e.response?.data?.message || 'Conversion failed'); }
    finally { setConverting(false); }
  };

  if (loading) return (
    <div style={{ background:'#eee', minHeight:'100vh', padding:'20px 0' }}>
      <div style={{ maxWidth:860, margin:'0 auto', background:'#fff', padding:'40px' }}>
        {[...Array(5)].map((_,i)=><Skeleton key={i} width="100%" height="28px" className="mb-3"/>)}
      </div>
    </div>
  );
  if (!doc) return <div style={{ padding:40, textAlign:'center', color:'#e00' }}>Document not found.</div>;

  const company    = settings || {};
  const vendor     = doc.vendor || {};
  const items      = doc.items  || [];
  const grandTotal = Number(doc.grandTotal) || 0;
  const taxRate    = items[0]?.taxRate || 0;
  const isIntra    = !doc.totalIGST || doc.totalIGST === 0;
  const hasTax     = (Number(doc.totalCGST)>0)||(Number(doc.totalSGST)>0)||(Number(doc.totalIGST)>0)
    || items.some(it => Number(it.cgst)>0 || Number(it.sgst)>0 || Number(it.igst)>0);
  const hasDiscount= items.some(it => Number(it.discount) > 0);

  const addrStr = (a) => {
    if (!a) return null;
    if (typeof a === 'string') return a;
    return [a.line1, a.line2, [a.city, a.state?`(${a.state})`:null, a.zip].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ');
  };

  const shortNo = doc.poNumber?.replace(/^PO-/,'') || doc.poNumber;

  return (
    <div style={{ background:'#eee', minHeight:'100vh', padding:'20px 0', fontFamily:'Arial, Helvetica, sans-serif' }}>

      {/* toolbar */}
      <div style={{ maxWidth:860, margin:'0 auto 12px', display:'flex', justifyContent:'space-between' }}
        className="print:hidden">
        <button onClick={()=>navigate('/purchase-orders')}
          style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:`1px solid ${BORDER}`,borderRadius:6,background:'#fff',cursor:'pointer',fontSize:13,color:'#333' }}>
          <FaArrowLeft size={13}/> Back
        </button>
        <div style={{ display:'flex',gap:8 }}>
          {doc.status!=='CONVERTED' && (
            <button onClick={handleConvert} disabled={converting}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700 }}>
              <FaArrowRight size={13}/> Convert to Invoice
            </button>
          )}
          <button onClick={()=>window.print()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 20px',background:TEAL,color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700 }}>
            <FaPrint size={13}/> Print / Download
          </button>
        </div>
      </div>

      {/* ════ A4 WHITE SHEET ════ */}
      <div id="doc-print" style={{
        maxWidth:860, margin:'0 auto', background:'#fff',
        boxShadow:'0 2px 20px rgba(0,0,0,0.12)',
        padding:'32px 36px 36px',
        fontFamily:'Arial, Helvetica, sans-serif',
        fontSize:12, color: TEXT,
      }}>

        {/* ── ROW 1 ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          {/* Left: logo + company */}
          <div style={{ width:'50%' }}>
            {(company.logoUrl||company.logo) && (
              <img src={company.logoUrl||company.logo} alt="logo"
                style={{ maxHeight:55,maxWidth:180,objectFit:'contain',marginBottom:10,display:'block' }}/>
            )}
            <div style={{ fontWeight:700,fontSize:14,color:TEAL,marginBottom:4 }}>{company.companyName}</div>
            <div style={{ fontSize:11,color:TEXT,lineHeight:1.4 }}>
              {addrStr(company.address) && <div>{addrStr(company.address)}</div>}
              {company.phone && <div>{company.phone}</div>}
              {company.email && <div>{company.email}</div>}
              {(company.gstin||company.website) && (
                <div>
                  {company.gstin && <><b>GSTIN:</b> {company.gstin}&nbsp;&nbsp;</>}
                  {company.website && <><b>Website:</b> {company.website}</>}
                </div>
              )}
              {company.contactName && <div><b>Contact Name:</b> {company.contactName}</div>}
            </div>
          </div>
          {/* Right */}
          <div style={{ width:'48%' }}>
            <div style={{ textAlign:'right',fontSize:11,color:MUTED,marginBottom:4,fontStyle:'italic' }}>Original for recipient</div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8 }}>
              <div style={{ fontSize:22,fontWeight:800,color:TEAL,letterSpacing:'-0.5px' }}>PURCHASE ORDER</div>
              <div style={{ fontSize:22,fontWeight:800,color:TEAL }}>#{shortNo}</div>
            </div>
            <div style={{ background:TEAL,color:'#fff',display:'flex',justifyContent:'space-between',padding:'6px 12px',fontWeight:700,fontSize:13,marginBottom:16 }}>
              <span>Amount Due:</span>
              <span>₹ {fmt(grandTotal)}</span>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr auto',rowGap:4,fontSize:11 }}>
              {[
                ['Issue Date:',   fmtDate(doc.date)],
                ['Valid Until:',  fmtDate(doc.validUntil||doc.dueDate)],
                ['Status:',       doc.status],
                doc.placeOfSupply ? ['Place of Supply:',doc.placeOfSupply] : null,
              ].filter(Boolean).map(([lbl,val])=>(
                <React.Fragment key={lbl}>
                  <div style={{ textAlign:'right',color:MUTED,paddingRight:12 }}>{lbl}</div>
                  <div style={{ textAlign:'right',color:TEXT }}>{val}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Company / Vendor ── */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ width:'48%' }}>
            <div style={{ fontSize:11,fontWeight:700,color:TEXT,marginBottom:2 }}>From (Company)</div>
            <div style={{ fontSize:13,fontWeight:700,color:TEAL,marginBottom:2 }}>{company.companyName}</div>
            <div style={{ fontSize:11,color:TEXT,lineHeight:1.4 }}>
              {addrStr(company.address) && <div>{addrStr(company.address)}</div>}
              {company.gstin && <div><b>GSTIN:</b> {company.gstin}</div>}
            </div>
          </div>
          <div style={{ width:'48%' }}>
            <div style={{ fontSize:11,fontWeight:700,color:TEXT,marginBottom:2 }}>To (Vendor)</div>
            <div style={{ fontSize:13,fontWeight:700,color:TEAL,marginBottom:2 }}>{vendor.name}</div>
            <div style={{ fontSize:11,color:TEXT,lineHeight:1.4 }}>
              {addrStr(vendor.address) && <div>{addrStr(vendor.address)}</div>}
              {vendor.gstin && <div><b>GSTIN:</b> {vendor.gstin}</div>}
              {vendor.phone && <div>Ph: {vendor.phone}</div>}
              {vendor.email && <div>{vendor.email}</div>}
            </div>
          </div>
        </div>

        {/* ════ TABLE ════ */}
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
          <thead>
            <tr>
              <th style={TH('center','42px')}>S.No</th>
              <th style={TH('left',null)}>{'Item\nDescription'}</th>
              <th style={TH('center','80px')}>HSN/SAC</th>
              <th style={TH('right','90px')}>{'Price\n(₹)'}</th>
              <th style={TH('center','65px')}>QTY</th>
              {hasDiscount && <th style={TH('right', '70px')}>{'Discount\n(%)'}</th>}
              {hasTax && <th style={TH('right','105px')}>{'Taxable Value\n(₹)'}</th>}
              {hasTax && isIntra  && <th style={TH('right','78px')}>{'CGST\n(₹)'}</th>}
              {hasTax && isIntra  && <th style={TH('right','78px')}>{'SGST\n(₹)'}</th>}
              {hasTax && !isIntra && <th style={TH('right','90px')}>{'IGST\n(₹)'}</th>}
              <th style={{ ...TH('right','96px'), borderRight:'none' }}>{'Amount\n(₹)'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item,i) => {
              const qty=Number(item.qty)||0, rate=Number(item.rate)||0, disc=Number(item.discount)||0;
              const taxable=qty*rate*(1-disc/100), cgstR=item.taxRate?item.taxRate/2:0;
              return (
                <tr key={i} style={{ background:i%2===0?'#fff':'#f8f8f8' }}>
                  <td style={TD('center')}>{i+1}</td>
                  <td style={TD('left')}>
                    <div style={{ fontWeight:700,color:TEAL }}>{item.name}</div>
                    {item.description && <div style={{ color:MUTED,fontSize:10,marginTop:1 }}>{item.description}</div>}
                  </td>
                  <td style={TD('center')}>{item.hsnCode||''}</td>
                  <td style={TD('right')}>{fmt(rate)}</td>
                  <td style={TD('center')}>
                    {qty}
                    {item.unit && <><br/><span style={{ fontSize:9, color: MUTED }}>{item.unit}</span></>}
                  </td>
                  {hasDiscount && <td style={TD('right')}>{disc > 0 ? `${disc}%` : ''}</td>}
                  {hasTax && <td style={TD('right')}>{fmt(taxable)}</td>}
                  {hasTax && isIntra && <>
                    <td style={TD('right')}>{fmt(item.cgst)}<br/><span style={{fontSize:9,color:MUTED}}>{cgstR}%</span></td>
                    <td style={TD('right')}>{fmt(item.sgst)}<br/><span style={{fontSize:9,color:MUTED}}>{cgstR}%</span></td>
                  </>}
                  {hasTax && !isIntra && <td style={TD('right')}>{fmt(item.igst)}<br/><span style={{fontSize:9,color:MUTED}}>{item.taxRate}%</span></td>}
                  <td style={{ ...TD('right'),fontWeight:700 }}>{fmt(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#eef5f8' }}>
              <td colSpan={5 + (hasDiscount ? 1 : 0)} style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,fontSize:11,color:TEXT,borderTop:`2px solid ${TEAL}` }}>
                Total {taxRate>0?`@${taxRate}%`:''}
              </td>
              {hasTax && <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${TEAL}` }}>{fmt(doc.subTotal)}</td>}
              {hasTax && isIntra && <>
                <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${TEAL}` }}>{fmt(doc.totalCGST)}</td>
                <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${TEAL}` }}>{fmt(doc.totalSGST)}</td>
              </>}
              {hasTax && !isIntra && <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${TEAL}` }}>{fmt(doc.totalIGST)}</td>}
              <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${TEAL}` }}>{fmt(doc.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ borderTop:`1px solid ${BORDER}`,margin:'0 0 12px' }}/>

        {/* ── ROW 3: Bank / Summary ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:4 }}>
          <div style={{ width:'44%', fontSize:11, lineHeight:1.8, color:TEXT }}>
            {doc.notes && <div style={{ fontSize:10,color:MUTED }}><b style={{ color:TEXT }}>Notes:</b><br/>{doc.notes}</div>}
            {doc.terms && <div style={{ marginTop:6,fontSize:10,color:MUTED }}><b style={{ color:TEXT }}>Terms & Conditions:</b><br/><span style={{ whiteSpace:'pre-wrap' }}>{doc.terms}</span></div>}
          </div>
          <div style={{ width:'52%', fontSize:12 }}>
            <R label="Total Taxable Value"    value={`₹ ${fmt(doc.subTotal)}`}/>
            {doc.shippingCharges>0 && <R label="Shipping Charges" value={`(+) ₹ ${fmt(doc.shippingCharges)}`}/>}
            {doc.packagingCharges>0 && <R label={doc.customChargeLabel || 'Custom Charge'} value={`(+) ₹ ${fmt(doc.packagingCharges)}`}/>}
            {doc.discountTotal>0   && <R label="Discount"          value={`(-) ₹ ${fmt(doc.discountTotal)}`}/>}
            <R label="Total Value (in figure)" value={`₹ ${fmt(Math.round(grandTotal))}`}/>
            <R label="Total Value (in words)"  value={`₹ ${numberToWords(Math.round(grandTotal))}`}/>
          </div>
        </div>



      </div>{/* end A4 */}

      <style>{`
        @media print {
          body { background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          .print\\:hidden { display:none !important; }
          #doc-print { box-shadow:none !important; }
          @page { size:A4; margin:0; }
        }
      `}</style>
    </div>
  );
};

const R = ({ label, value }) => (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', gap:12 }}>
    <b style={{ whiteSpace:'nowrap' }}>{label}</b>
    <span style={{ textAlign:'right' }}>{value}</span>
  </div>
);

export default PurchaseOrderPrint;
