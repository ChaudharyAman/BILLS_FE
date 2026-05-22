import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPrint, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ClassicBusinessDocumentPrint from '../components/ClassicBusinessDocumentPrint';

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

const fmt  = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
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
    textAlign:align, width: width||undefined, whiteSpace:'pre-line', lineHeight:1.3,
    borderRight:'1px solid rgba(255,255,255,0.18)' };
}
function TD(align) {
  return { padding:'7px 8px', textAlign:align, verticalAlign:'top',
    borderBottom:`1px solid ${BORDER}`, color: TEXT };
}

// ── Component ────────────────────────────────────────────────────
const QuotePrint = ({ docType = 'quote' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isProforma = docType === 'proforma';

  const apiBase  = isProforma ? '/proformas' : '/quotes';
  const listPath = isProforma ? '/proformas' : '/quotes';
  const docLabel = isProforma ? 'PROFORMA INVOICE' : 'QUOTATION';
  const PRIMARY  = isProforma ? '#1e6a45' : TEAL;

  const [doc, setDoc]           = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [converting, setConverting] = useState(false);
  const [template, setTemplate] = useState('modern');

  useEffect(() => {
    (async () => {
      try {
        const [docRes, settRes] = await Promise.allSettled([
          api.get(`${apiBase}/${id}`),
          api.get('/settings'),
        ]);
        if (docRes.status  === 'fulfilled') setDoc(docRes.value.data);
        if (settRes.status === 'fulfilled') setSettings(settRes.value.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, apiBase]);

  useEffect(() => {
    if (doc) {
      const no = isProforma ? doc.proformaNo : doc.quoteNo;
      document.title = `${no||'Document'} – ${doc.client?.name||'Client'}`;
    }
    return () => { document.title = 'Flance'; };
  }, [doc, isProforma]);

  const handleConvert = async () => {
    if (!window.confirm(`Convert this ${isProforma?'Proforma':'Quote'} to an Invoice?`)) return;
    setConverting(true);
    try {
      const res = await api.post(`${apiBase}/${id}/convert`);
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
  const client     = doc.client || {};
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

  const docNo   = isProforma ? doc.proformaNo : doc.quoteNo;
  const shortNo = docNo?.replace(/^(PRF-|PRO-|QT-|QUOT-)/,'') || docNo;

  return (
    <div className="print-page-container" style={{ background:'#eee', minHeight:'100vh', padding:'20px 0', fontFamily:'Arial, Helvetica, sans-serif' }}>

      {/* toolbar */}
      <div style={{ maxWidth:860, margin:'0 auto 12px', display:'flex', justifyContent:'space-between' }}
        className="print:hidden">
        <button onClick={()=>navigate(listPath)}
          style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:`1px solid ${BORDER}`,borderRadius:6,background:'#fff',cursor:'pointer',fontSize:13,color:'#333'}}>
          <FaArrowLeft size={13}/> Back
        </button>
        <div style={{ display:'flex',gap:8 }}>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{ padding:'7px 12px',borderRadius:'6px',border:'1px solid #d0d0d0',fontSize:'13px',outline:'none',cursor:'pointer',background:'#fff' }}
          >
            <option value="modern">Modern Template</option>
            <option value="classic">Classic GST Template</option>
          </select>
          {doc.status!=='CONVERTED' && (
            <button onClick={handleConvert} disabled={converting}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700 }}>
              <FaArrowRight size={13}/> Convert to Invoice
            </button>
          )}
          <button onClick={()=>window.print()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 20px',background:PRIMARY,color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:700 }}>
            <FaPrint size={13}/> Print / Download
          </button>
        </div>
      </div>

      {template === 'classic' ? (
        <ClassicBusinessDocumentPrint
          documentTitle={docLabel}
          documentNumberLabel={isProforma ? 'Proforma No.' : 'Quote No.'}
          documentNumber={docNo}
          company={company}
          leftPartyTitle="Billed to   :"
          leftParty={client}
          rightPartyTitle="Shipped to  :"
          rightParty={{
            name: client.name,
            address: doc.shippingAddress?.line1 ? doc.shippingAddress : client.address,
            gstin: client.gstin,
          }}
          documentDate={doc.date}
          validUntil={doc.validUntil || doc.dueDate}
          placeOfSupply={doc.placeOfSupply}
          reverseCharge={doc.reverseCharge}
          items={items}
          hasTax={hasTax}
          isIntra={isIntra}
          subTotal={doc.subTotal}
          totalCGST={doc.totalCGST}
          totalSGST={doc.totalSGST}
          totalIGST={doc.totalIGST}
          shippingCharges={doc.shippingCharges}
          packagingCharges={doc.packagingCharges}
          customChargeLabel={doc.customChargeLabel}
          discountTotal={doc.discountTotal}
          grandTotal={grandTotal}
          terms={doc.terms}
          notes={doc.notes}
        />
      ) : (
      <>
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
                style={{ maxHeight:55, maxWidth:180, objectFit:'contain', marginBottom:10, display:'block' }}/>
            )}
            <div style={{ fontWeight:700, fontSize:14, color: PRIMARY, marginBottom:4 }}>{company.companyName}</div>
            <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
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
            <div style={{ textAlign:'right', fontSize:11, color: MUTED, marginBottom:4, fontStyle:'italic' }}>Original for recipient</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
              <div style={{ fontSize:22, fontWeight:800, color: PRIMARY, letterSpacing:'-0.5px' }}>{docLabel}</div>
              <div style={{ fontSize:22, fontWeight:800, color: PRIMARY }}>#{shortNo}</div>
            </div>
            {/* Amount bar */}
            <div style={{ background: PRIMARY, color:'#fff', display:'flex', justifyContent:'space-between', padding:'6px 12px', fontWeight:700, fontSize:13, marginBottom:16 }}>
              <span>Amount:</span>
              <span>₹ {fmt(grandTotal)}</span>
            </div>
            {/* Meta */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:4, fontSize:11 }}>
              {[
                ['Issue Date:',   fmtDate(doc.date)],
                ['Valid Until:',  fmtDate(doc.validUntil||doc.dueDate)],
                ['Status:',       doc.status],
                doc.placeOfSupply ? ['Place of Supply:', doc.placeOfSupply] : null,
                doc.paymentTerms  ? ['Payment Terms:',  doc.paymentTerms]  : null,
              ].filter(Boolean).map(([lbl,val])=>(
                <React.Fragment key={lbl}>
                  <div style={{ textAlign:'right', color: MUTED, paddingRight:12 }}>{lbl}</div>
                  <div style={{ textAlign:'right', color: TEXT }}>{val}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        {/* ── ROW 2: Bill To / Ship To ── */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ width:'48%' }}>
            <div style={{ fontSize:11, fontWeight:700, color: TEXT, marginBottom:2 }}>Bill To</div>
            <div style={{ fontSize:13, fontWeight:700, color: PRIMARY, marginBottom:2 }}>{client.name}</div>
            <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
              {addrStr(client.address) && <div>{addrStr(client.address)}</div>}
              {client.gstin && <div><b>GSTIN:</b> {client.gstin}</div>}
              {client.phone && <div>Ph: {client.phone}</div>}
            </div>
          </div>
          <div style={{ width:'48%' }}>
            <div style={{ fontSize:11, fontWeight:700, color: TEXT, marginBottom:2 }}>Ship To</div>
            <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
              {doc.shippingAddress?.line1 ? addrStr(doc.shippingAddress) : addrStr(client.address) || 'Same as billing address'}
            </div>
          </div>
        </div>

        {/* ════ TABLE ════ */}
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
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
            {items.map((item, i) => {
              const qty     = Number(item.qty)      || 0;
              const rate    = Number(item.rate)     || 0;
              const discPct = Number(item.discount) || 0;
              const taxable = qty * rate * (1 - discPct / 100);
              const cgstR   = item.taxRate ? item.taxRate / 2 : 0;
              return (
                <tr key={i} style={{ background: i%2===0?'#fff':'#f8f8f8' }}>
                  <td style={TD('center')}>{i+1}</td>
                  <td style={TD('left')}>
                    <div style={{ fontWeight:700, color: PRIMARY }}>{item.name}</div>
                    {item.description && <div style={{ color: MUTED, fontSize:10, marginTop:1 }}>{item.description}</div>}
                  </td>
                  <td style={TD('center')}>{item.hsnCode||''}</td>
                  <td style={TD('right')}>{fmt(rate)}</td>
                  <td style={TD('center')}>
                    {qty}
                    {item.unit && <><br/><span style={{ fontSize:9, color: MUTED }}>{item.unit}</span></>}
                  </td>
                  {hasDiscount && <td style={TD('right')}>{discPct > 0 ? `${discPct}%` : ''}</td>}
                  {hasTax && <td style={TD('right')}>{fmt(taxable)}</td>}
                  {hasTax && isIntra && <>
                    <td style={TD('right')}>{fmt(item.cgst)}<br/><span style={{fontSize:9,color:MUTED}}>{cgstR}%</span></td>
                    <td style={TD('right')}>{fmt(item.sgst)}<br/><span style={{fontSize:9,color:MUTED}}>{cgstR}%</span></td>
                  </>}
                  {hasTax && !isIntra && <td style={TD('right')}>{fmt(item.igst)}<br/><span style={{fontSize:9,color:MUTED}}>{item.taxRate}%</span></td>}
                  <td style={{ ...TD('right'), fontWeight:700 }}>{fmt(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'#eef5f8' }}>
              <td colSpan={5 + (hasDiscount ? 1 : 0)} style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,fontSize:11,color:TEXT,borderTop:`2px solid ${PRIMARY}` }}>
                Total {taxRate>0?`@${taxRate}%`:''}
              </td>
              {hasTax && <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${PRIMARY}` }}>{fmt(doc.subTotal)}</td>}
              {hasTax && isIntra && <>
                <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${PRIMARY}` }}>{fmt(doc.totalCGST)}</td>
                <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${PRIMARY}` }}>{fmt(doc.totalSGST)}</td>
              </>}
              {hasTax && !isIntra && <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${PRIMARY}` }}>{fmt(doc.totalIGST)}</td>}
              <td style={{ padding:'7px 8px',textAlign:'right',fontWeight:700,borderTop:`2px solid ${PRIMARY}` }}>{fmt(doc.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ borderTop:`1px solid ${BORDER}`, margin:'0 0 12px' }}/>

        {/* ── ROW 3: Bank (left) | Summary (right) ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:4 }}>
          {/* Left: bank (proforma) or notes */}
          <div style={{ width:'44%', fontSize:11, lineHeight:1.8, color: TEXT }}>
            {isProforma && (() => {
              const bank = company.bankDetails || {};
              return (<>
                {bank.accountName   && <div><b>Account Holder Name:</b> {bank.accountName.toUpperCase()}</div>}
                {bank.bankName      && <div><b>Bank Name:</b> {bank.bankName.toUpperCase()}</div>}
                {bank.accountNumber && <div><b>Account Number:</b> {bank.accountNumber}</div>}
                {bank.branch        && <div><b>Branch Name:</b> {bank.branch.toUpperCase()}</div>}
                {bank.ifscCode      && <div><b>IFSC Code:</b> {bank.ifscCode}</div>}
              </>);
            })()}
            {doc.notes && <div style={{ marginTop:isProforma?8:0, fontSize:10, color: MUTED }}><b style={{ color: TEXT }}>Notes:</b><br/>{doc.notes}</div>}
            {doc.terms && <div style={{ marginTop:6, fontSize:10, color: MUTED }}><b style={{ color: TEXT }}>Terms & Conditions:</b><br/><span style={{whiteSpace:'pre-wrap'}}>{doc.terms}</span></div>}
          </div>
          {/* Right: summary */}
          <div style={{ width:'52%', fontSize:12 }}>
            <Row label="Total Taxable Value" value={`₹ ${fmt(doc.subTotal)}`} />
            {doc.shippingCharges>0 && <Row label="Shipping Charges" value={`(+) ₹ ${fmt(doc.shippingCharges)}`}/>}
            {doc.packagingCharges>0 && <Row label={doc.customChargeLabel || 'Custom Charge'} value={`(+) ₹ ${fmt(doc.packagingCharges)}`}/>}
            {doc.discountTotal>0   && <Row label="Discount"          value={`(-) ₹ ${fmt(doc.discountTotal)}`}/>}
            <Row label="Total Value (in figure)"  value={`₹ ${fmt(Math.round(grandTotal))}`} />
            <Row label="Total Value (in words)"   value={`₹ ${numberToWords(Math.round(grandTotal))}`} />
          </div>
        </div>



      </div>{/* end A4 */}
      </>
      )}

      <style>{`
        @media print {
          html, body, #root, [class*="bg-gray-"], .min-h-screen, .print-page-container { 
            background: #fff !important; 
            background-color: #fff !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            min-height: auto !important;
            height: auto !important;
          }
          body {
            margin: 0 !important; 
            padding: 10mm !important; /* Beautiful custom safe margin on all sides */
          }
          .print-page-container { 
            padding: 0 !important; 
            min-height: auto !important;
            height: auto !important;
            background: #fff !important;
          }
          .print\\:hidden { display: none !important; }
          #doc-print, #invoice-print-classic { 
            box-shadow: none !important; 
            page-break-inside: avoid;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            background: #fff !important;
          }
          @page { 
            size: A4; 
            margin: 0; /* Hides default browser header and footer */
          }
          thead { display: table-row-group; }
          tfoot { display: table-row-group; }
        }
      `}</style>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', gap:12 }}>
    <b style={{ whiteSpace:'nowrap' }}>{label}</b>
    <span style={{ textAlign:'right' }}>{value}</span>
  </div>
);

export default QuotePrint;
