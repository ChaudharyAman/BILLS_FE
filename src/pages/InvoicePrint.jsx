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
  return `${String(dt.getDate()).padStart(2,'0')}-${dt.toLocaleString('en-IN',{month:'short'})}-${dt.getFullYear()}`;
};

const addrStr = (a) => {
  if (!a) return null;
  if (typeof a === 'string') return a;
  return [a.line1, a.line2, [a.city, a.state ? `(${a.state})` : null, a.zip].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ');
};

// ── Color palette ─────────────────────────────────────────────────
const TEAL   = '#1e5f78';
const DARK   = '#1e293b';
const TEXT   = '#1a1a1a';
const MUTED  = '#555';
const BORDER = '#d0d0d0';

// ── Style helpers ────────────────────────────────────────────────
function TH(align, width) {
  return {
    padding: '4px 8px',
    background: TEAL,
    color: '#fff',
    fontWeight: 400,
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
    padding: '4px 8px',
    textAlign: align,
    verticalAlign: 'top',
    borderBottom: `1px solid ${BORDER}`,
    color: TEXT,
    ...(noWrap ? {} : { whiteSpace: 'nowrap' }),
  };
}

const SummaryRow = ({ label, value, green, red, isBoldValue, vWidth = '220px' }) => (
  <div style={{ display:'flex', justifyContent:'flex-end', padding:'2px 0', gap:30,
    color: green ? '#059669' : red ? '#dc2626' : DARK, fontSize: 11 }}>
    <span style={{ width: '150px', whiteSpace:'nowrap', color: green ? '#059669' : red ? '#dc2626' : DARK, textAlign: 'right', fontWeight: 700 }}>{label}</span>
    <span style={{ textAlign:'right', width: vWidth, fontWeight: isBoldValue ? 700 : 400 }}>{value}</span>
  </div>
);

// ── MODERN TEMPLATE ───────────────────────────────────────────────
const ModernTemplate = ({ invoice, company, client, bank, items, hasTax, isIntra, hasExcise, hasDiscount, grandTotal, amountDue, rounded, balanceDue, advancePaid, tds, taxRate, invType }) => {
  const companyAddr = addrStr(company.address);
  const clientAddr  = addrStr(client.address);
  const shipAddr    = invoice.shippingAddress?.line1 ? addrStr(invoice.shippingAddress) : (client.shippingAddress?.line1 ? addrStr(client.shippingAddress) : clientAddr);
  
  const isTdsApplicable = invoice.tds_applicable !== undefined ? invoice.tds_applicable : invoice.tdsApplicable;
  const tdsSection = invoice.tds_section !== undefined ? invoice.tds_section : invoice.tdsSection;
  const tdsRate = invoice.tds_rate !== undefined ? invoice.tds_rate : invoice.tdsRate;
  
  return (
    <div id="invoice-print-modern" style={{
      maxWidth: 860, margin: '0 auto', background: '#fff',
      padding: '32px 36px 36px',
      fontFamily: 'Calibri, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      fontSize: 12, color: TEXT,
    }}>
      {/* ── ROW 1: Logo+Company (left) | Invoice Title (right) ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 28 }}>
        <div style={{ width: '50%', paddingTop: 18 }}>
          {(company.logoUrl || company.logo) && (
            <img src={company.logoUrl || company.logo} alt="logo"
              style={{ maxHeight:55, maxWidth:180, objectFit:'contain', marginBottom:10, display:'block' }}/>
          )}
          <div style={{ fontWeight:700, fontSize:15, color: TEAL, marginBottom:6 }}>
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

        <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:8, width: '100%' }}>
            <div style={{ fontSize:22, fontWeight:700, color: DARK, letterSpacing:'-0.5px' }}>
              {invType.toUpperCase()}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color: DARK, marginBottom: 2 }}>Original for recipient</div>
              <div style={{ fontSize:22, fontWeight:700, color: DARK }}>
                #{invoice.invoiceNo?.replace(/^INV-/,'') || invoice.invoiceNo}
              </div>
            </div>
          </div>

          <div style={{
            background: TEAL, color:'#fff',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'2px 12px', fontWeight:400, fontSize:13, marginBottom:16,
            width: '100%', minWidth: '260px'
          }}>
            <span>Amount Due:</span>
            <span>₹ {fmt(amountDue)}</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'auto auto', columnGap: 60, rowGap:0, fontSize:11, lineHeight: 1.2 }}>
            {[
              ['Issue Date:',       fmtDate(invoice.date)],
              ['Due Date:',         fmtDate(invoice.dueDate)],
              invoice.transport?.poNumber ? ['PO Number:', invoice.transport.poNumber]       : null,
              invoice.transport?.poDate   ? ['PO Date:',   fmtDate(invoice.transport.poDate)] : null,
              invoice.placeOfSupply       ? ['Place of Supply:', invoice.placeOfSupply]       : null,
              invoice.paymentMode         ? ['Payment Mode:',    invoice.paymentMode]         : null,
              hasTax                      ? ['Reverse Charge:',  invoice.reverseCharge ? 'Yes' : 'No'] : null,
            ].filter(Boolean).map(([lbl, val]) => (
              <React.Fragment key={lbl}>
                <div style={{ textAlign:'right', color: MUTED, whiteSpace: 'nowrap' }}>{lbl}</div>
                <div style={{ textAlign:'right', color: TEXT, whiteSpace: 'nowrap' }}>{val}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Bill To | Ship To ── */}
      <div style={{ display:'flex', gap: 60, marginBottom: 12 }}>
        <div style={{ width:'48%' }}>
          <div style={{ fontSize:11, fontWeight:700, color: DARK, marginBottom: 8 }}>Bill To</div>
          <div style={{ fontSize:13, fontWeight:700, color: DARK, marginBottom:2 }}>{client.name}</div>
          <div style={{ fontSize:11, color: TEXT, lineHeight:1.4 }}>
            {clientAddr && <div>{clientAddr}</div>}
            {client.gstin && <div><b>GSTIN:</b> {client.gstin}</div>}
            {client.phone && <div><b>Ph:</b> {client.phone}</div>}
            {client.email && <div>{client.email}</div>}
          </div>
        </div>
        <div style={{ width:'48%' }}>
          <div style={{ fontSize:11, fontWeight:700, color: DARK, marginBottom: 8 }}>Ship To</div>
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
            <th style={TH('left', '32%')}>Item{'\n'}Description</th>
            <th style={TH('center','10%')}>HSN/SAC</th>
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
                <td style={{ ...TD('center'), fontWeight:700 }}>{i + 1}</td>
                <td style={TD('left', true)}>
                  <div style={{ fontWeight:700, color: TEAL }}>{item.name}</div>
                  {item.description && (
                    <div style={{ color: MUTED, fontSize:10, marginTop:1, whiteSpace:'pre-wrap' }}>{item.description}</div>
                  )}
                </td>
                <td style={{ ...TD('center'), fontWeight:700 }}>{item.hsnCode || ''}</td>
                <td style={{ ...TD('right'), fontWeight:700 }}>{fmt(rate)}</td>
                {hasDiscount && <td style={TD('right')}>{discPct > 0 ? `${discPct}%` : ''}</td>}
                {hasTax && <td style={{ ...TD('right'), fontWeight:700 }}>{fmt(taxable)}</td>}
                {hasTax && isIntra && (
                  <td style={{ ...TD('right'), fontWeight:700 }}>
                    {fmt(cgstAmt)}
                    {cgstR > 0 && <><br/><span style={{ fontSize:9, color: MUTED, fontWeight:400 }}>{cgstR}%</span></>}
                  </td>
                )}
                {hasTax && isIntra && (
                  <td style={{ ...TD('right'), fontWeight:700 }}>
                    {fmt(sgstAmt)}
                    {cgstR > 0 && <><br/><span style={{ fontSize:9, color: MUTED, fontWeight:400 }}>{cgstR}%</span></>}
                  </td>
                )}
                {hasTax && !isIntra && (
                  <td style={{ ...TD('right'), fontWeight:700 }}>
                    {fmt(igstAmt)}
                    {item.taxRate > 0 && <><br/><span style={{ fontSize:9, color: MUTED, fontWeight:400 }}>{item.taxRate}%</span></>}
                  </td>
                )}
                {hasExcise && (
                  <td style={{ ...TD('right'), fontWeight:700 }}>
                    {fmt(item.exciseAmount)}<br/>
                    <span style={{ fontSize:9, color: MUTED, fontWeight:400 }}>BED {item.bedPercent}%</span>
                  </td>
                )}
                <td style={{ ...TD('right'), fontWeight:700 }}>{fmt(item.amount)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background:'#eef5f8' }}>
            <td colSpan={4 + (hasDiscount ? 1 : 0)} style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, fontSize:11, color: TEXT, borderTop:`2px solid ${TEAL}` }}>
              Total {taxRate > 0 ? `@${taxRate}%` : ''}
            </td>
            {hasTax && (
              <td style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, borderTop:`2px solid ${TEAL}` }}>
                {fmt(invoice.subTotal)}
              </td>
            )}
            {hasTax && isIntra && (
              <>
                <td style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, borderTop:`2px solid ${TEAL}` }}>
                  {fmt(invoice.totalCGST)}
                </td>
                <td style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, borderTop:`2px solid ${TEAL}` }}>
                  {fmt(invoice.totalSGST)}
                </td>
              </>
            )}
            {hasTax && !isIntra && (
              <td style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, borderTop:`2px solid ${TEAL}` }}>
                {fmt(invoice.totalIGST)}
              </td>
            )}
            {hasExcise && (
              <td style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, borderTop:`2px solid ${TEAL}` }}>
                {fmt(invoice.exciseDuty?.totalExcise)}
              </td>
            )}
            <td style={{ padding:'4px 8px', textAlign:'right', fontWeight:400, borderTop:`2px solid ${TEAL}` }}>
              {fmt(invoice.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ borderTop:`1px solid ${BORDER}`, margin:'0 0 12px' }}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:4 }}>
        <div style={{ width:'44%', fontSize:11, lineHeight:1.8, color: DARK }}>
          {bank.accountName   && <div><b>Account Holder Name:</b> {bank.accountName.toUpperCase()}</div>}
          {bank.bankName      && <div><b>Bank Name:</b> {bank.bankName.toUpperCase()}</div>}
          {bank.accountNumber && <div><b>Account Number:</b> {bank.accountNumber}</div>}
          {bank.branch        && <div><b>Branch Name:</b> {bank.branch.toUpperCase()}</div>}
          {bank.ifscCode      && <div><b>IFSC Code:</b> {bank.ifscCode}</div>}
          {invoice.terms && (
            <div style={{ marginTop:10, fontSize:10, color: MUTED }}>
              <span style={{ color: TEXT }}>Terms &amp; Conditions:</span><br/>
              <span style={{ whiteSpace:'pre-wrap' }}>{invoice.terms}</span>
            </div>
          )}
          {invoice.notes && (
            <div style={{ marginTop:6, fontSize:10, color: MUTED }}>
              <span style={{ color: TEXT }}>Notes:</span><br/>{invoice.notes}
            </div>
          )}
        </div>

        <div style={{ width:'54%', fontSize:12 }}>
          <SummaryRow label="Total Taxable Value"    value={`₹ ${fmt(invoice.subTotal)}`} isBoldValue />
          {invoice.shippingCharges > 0 && <SummaryRow label="Shipping Charges" value={`(+) ₹ ${fmt(invoice.shippingCharges)}`} isBoldValue />}
          {invoice.packagingCharges > 0 && <SummaryRow label={invoice.customChargeLabel || 'Custom Charge'} value={`(+) ₹ ${fmt(invoice.packagingCharges)}`} isBoldValue />}
          {invoice.discountTotal > 0 && <SummaryRow label="Discount" value={`(-) ₹ ${fmt(invoice.discountTotal)}`} isBoldValue />}
          {Math.abs(rounded) >= 0.005 && (
            <SummaryRow 
              label="Rounded Off" 
              value={`${rounded < 0 ? '(-)' : '(+)'} ₹ ${fmt(Math.abs(rounded))}`} 
              isBoldValue
            />
          )}
          {isTdsApplicable && hasTax && isIntra && (
            <>
              <SummaryRow label={`CGST (${taxRate / 2}%)`} value={`₹ ${fmt(invoice.totalCGST)}`} />
              <SummaryRow label={`SGST (${taxRate / 2}%)`} value={`₹ ${fmt(invoice.totalSGST)}`} />
            </>
          )}
          {isTdsApplicable && hasTax && !isIntra && (
            <SummaryRow label={`IGST (${taxRate}%)`} value={`₹ ${fmt(invoice.totalIGST)}`} />
          )}
          {isTdsApplicable && tds > 0 && (
            <SummaryRow 
              label={`TDS - Sec ${tdsSection || '194C'} (${tdsRate || 0}%)`} 
              value={`(-) ₹ ${fmt(tds)}`} 
              red 
              isBoldValue 
              vWidth="220px" 
            />
          )}
          <SummaryRow 
            label={isTdsApplicable ? "Net Payable" : "Total Value (in figure)"}  
            value={`₹ ${Math.round(isTdsApplicable ? (grandTotal - tds) : grandTotal).toLocaleString('en-IN')}`} 
            isBoldValue 
            vWidth="220px" 
          />
          {advancePaid > 0 && <SummaryRow label="Advance Paid"  value={`(-) ₹ ${fmt(advancePaid)}`} green isBoldValue vWidth="220px" />}
          {(!isTdsApplicable && tds > 0) && <SummaryRow label="TDS Deducted"  value={`(-) ₹ ${fmt(tds)}`} red isBoldValue vWidth="220px" />}
          {(advancePaid > 0 || tds > 0) && <SummaryRow label="Balance Due"   value={`₹ ${fmt(balanceDue)}`}    red isBoldValue vWidth="220px" />}
          
          <SummaryRow 
            label={isTdsApplicable ? "Net Payable (in words)" : "Total Value (in words)"} 
            value={`₹ ${numberToWords(Math.round(isTdsApplicable ? (grandTotal - tds) : grandTotal))}`} 
            isBoldValue 
            vWidth="220px" 
          />
          
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{
              border: '1px dashed #1e5f78',
              borderRadius: '6px',
              padding: '10px 14px',
              background: '#f8fafc',
              textAlign: 'center',
              fontSize: '10px',
              color: '#334155',
              maxWidth: '280px',
              lineHeight: '1.5',
            }}>
              <div style={{ fontWeight: 'bold', color: '#1e5f78', textTransform: 'uppercase', fontSize: '9px', marginBottom: '4px', letterSpacing: '0.5px' }}>
                Digitally Signed Document
              </div>
              This is a computer generated {invType.toLowerCase()}, digitally signed, and does not require a physical signature.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ── CLASSIC GST TEMPLATE ──────────────────────────────────────────
const ClassicTemplateOld = ({ invoice, company, client, items, hasTax, isIntra, hasExcise, hasDiscount, grandTotal, amountDue, rounded, balanceDue, advancePaid, tds, taxRate, bank, invType }) => {
  const cTh = { borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' };
  const cTd = { borderRight: '1px solid #000', padding: '4px 4px 0 4px', verticalAlign: 'top' };
  const cTdBorder = { borderRight: '1px solid #000' };
  
  const companyPAN = company.gstin && company.gstin.length >= 12 ? company.gstin.substring(2, 12).toUpperCase() : '';
  const companyAddr = addrStr(company.address);
  const clientAddr  = addrStr(client.address);
  const shipAddr    = invoice.shippingAddress?.line1 ? addrStr(invoice.shippingAddress) : (client.shippingAddress?.line1 ? addrStr(client.shippingAddress) : clientAddr);

  return (
    <div id="invoice-print-classic" className="classic-template" style={{
      maxWidth: 860, margin: '0 auto', background: '#fff',
      fontFamily: 'Arial, sans-serif',
      fontSize: 11, color: '#000',
      border: '1px solid #000',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px' }}>
        <div><b>GSTIN : {company.gstin || ''}</b></div>
        <div style={{ fontStyle: 'italic' }}>Original Copy</div>
      </div>
      
      <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>{invType.toUpperCase()}</div>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', textTransform: 'uppercase' }}>{company.companyName}</h2>
        <div style={{ fontSize: '10px' }}>{companyAddr}</div>
        {company.phone && <div style={{ fontSize: '10px' }}>Ph: {company.phone}</div>}
        {companyPAN && <div style={{ fontSize: '10px' }}>PAN : {companyPAN}</div>}
      </div>

      {/* Grid Row 1: Invoice Details */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
        <div style={{ width: '50%', borderRight: '1px solid #000', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex' }}><div style={{ width: '100px' }}>Invoice No.</div><div>: <b>{invoice.invoiceNo}</b></div></div>
          <div style={{ display: 'flex' }}><div style={{ width: '100px' }}>Dated</div><div>: <b>{fmtDate(invoice.date)}</b></div></div>
        </div>
        <div style={{ width: '50%', padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex' }}><div style={{ width: '120px' }}>Place of Supply</div><div>: <b>{invoice.placeOfSupply || (client.address?.state) || ''}</b></div></div>
          <div style={{ display: 'flex' }}><div style={{ width: '120px' }}>Reverse Charge</div><div>: <b>{invoice.reverseCharge ? 'Y' : 'N'}</b></div></div>
        </div>
      </div>

      {/* Grid Row 2: Billed To / Shipped To */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        <div style={{ width: '50%', borderRight: '1px solid #000', padding: '4px 8px' }}>
          <div style={{ fontStyle: 'italic', marginBottom: '4px' }}><b>Billed to :</b></div>
          <div style={{ fontWeight: 'bold' }}>{client.name}</div>
          <div style={{ fontSize: '10px', minHeight: '30px' }}>{clientAddr}</div>
          <div style={{ marginTop: '4px' }}>GSTIN / UIN &nbsp;&nbsp;&nbsp;&nbsp;: {client.gstin || ''}</div>
        </div>
        <div style={{ width: '50%', padding: '4px 8px' }}>
          <div style={{ fontStyle: 'italic', marginBottom: '4px' }}><b>Shipped to :</b></div>
          <div style={{ fontWeight: 'bold' }}>{client.name}</div>
          <div style={{ fontSize: '10px', minHeight: '30px' }}>{shipAddr}</div>
          <div style={{ marginTop: '4px' }}>GSTIN / UIN &nbsp;&nbsp;&nbsp;&nbsp;: {client.gstin || ''}</div>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ ...cTh, width: '40px', textAlign: 'center' }}>S.N.</th>
            <th style={cTh}>Description of Goods</th>
            <th style={cTh}>HSN/SAC<br/>Code</th>
            <th style={{ ...cTh, textAlign: 'right' }}>Qty.</th>
            <th style={cTh}>Unit</th>
            <th style={{ ...cTh, textAlign: 'right' }}>List Price</th>
            {hasDiscount && <th style={{ ...cTh, textAlign: 'right' }}>Discount</th>}
            <th style={{ ...cTh, textAlign: 'right' }}>Price</th>
            <th style={{ ...cTh, textAlign: 'right', borderRight: 'none' }}>Amount(₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const listPrice = Number(item.rate) || 0;
            const discountPct = Number(item.discount) || 0;
            const discountAmt = listPrice * (discountPct / 100);
            const netPrice = listPrice - discountAmt;
            const qty = Number(item.qty) || 0;
            const itemTaxable = qty * netPrice;
            
            return (
              <tr key={i}>
                <td style={{ ...cTd, textAlign: 'center' }}>{i + 1}.</td>
                <td style={cTd}>
                  {item.name}
                  {item.description && <div style={{ fontStyle: 'italic', fontSize: '9px', marginTop: '2px' }}>{item.description}</div>}
                </td>
                <td style={cTd}>{item.hsnCode}</td>
                <td style={{ ...cTd, textAlign: 'right' }}>{qty.toFixed(2)}</td>
                <td style={cTd}>{item.unit || 'Nos'}</td>
                <td style={{ ...cTd, textAlign: 'right' }}>{fmt(listPrice)}</td>
                {hasDiscount && <td style={{ ...cTd, textAlign: 'right' }}>{discountPct > 0 ? `${discountPct} %` : ''}</td>}
                <td style={{ ...cTd, textAlign: 'right' }}>{fmt(netPrice)}</td>
                <td style={{ ...cTd, textAlign: 'right', borderRight: 'none' }}>{fmt(itemTaxable)}</td>
              </tr>
            );
          })}
          
          <tr style={{ height: '100px' }}>
             <td style={cTdBorder}></td>
             <td style={cTdBorder}></td>
             <td style={cTdBorder}></td>
             <td style={cTdBorder}></td>
             <td style={cTdBorder}></td>
             <td style={cTdBorder}></td>
             {hasDiscount && <td style={cTdBorder}></td>}
             <td style={cTdBorder}></td>
             <td style={{ ...cTdBorder, borderRight: 'none' }}></td>
          </tr>
        </tbody>
      </table>

      {/* Subtotal / Taxes area */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: '4px 8px', gap: '4px' }}>
          {hasTax && isIntra && <>
             <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between', fontStyle: 'italic' }}>
               <span>Add : CGST</span>
               <span>{fmt(invoice.totalCGST)}</span>
             </div>
             <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between', fontStyle: 'italic' }}>
               <span>Add : SGST</span>
               <span>{fmt(invoice.totalSGST)}</span>
             </div>
          </>}
          {hasTax && !isIntra && <>
             <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between', fontStyle: 'italic' }}>
               <span>Add : IGST</span>
               <span>{fmt(invoice.totalIGST)}</span>
             </div>
          </>}
          {Number(invoice.shippingCharges) > 0 && 
             <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between', fontStyle: 'italic' }}>
               <span>Add : Shipping</span>
               <span>{fmt(invoice.shippingCharges)}</span>
             </div>
          }
          {Number(invoice.packagingCharges) > 0 && 
             <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between', fontStyle: 'italic' }}>
               <span>Add : {invoice.customChargeLabel || 'Custom Charge'}</span>
               <span>{fmt(invoice.packagingCharges)}</span>
             </div>
          }
          {Number(invoice.discountTotal) > 0 && 
             <div style={{ display: 'flex', width: '200px', justifyContent: 'space-between', fontStyle: 'italic' }}>
               <span>Less : Discount</span>
               <span>{fmt(invoice.discountTotal)}</span>
             </div>
          }
        </div>
        <div style={{ width: '100px', padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', fontWeight: 'bold' }}>
           <div>{fmt(invoice.grandTotal)}</div>
        </div>
      </div>

      {/* Grand Total Row */}
      <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
        <div style={{ flex: 1, padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>Grand Total</div>
        <div style={{ padding: '4px 8px', width: '100px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(grandTotal)}</div>
      </div>

      {/* Tax Summary Table */}
      {hasTax && (
        <div style={{ borderBottom: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px dotted #000' }}>
                <th style={{ padding: '2px 8px', textAlign: 'left' }}>HSN/SAC</th>
                <th style={{ padding: '2px 8px', textAlign: 'right' }}>Tax Rate</th>
                <th style={{ padding: '2px 8px', textAlign: 'right' }}>Taxable Amt.</th>
                {isIntra ? <>
                  <th style={{ padding: '2px 8px', textAlign: 'right' }}>CGST Amt.</th>
                  <th style={{ padding: '2px 8px', textAlign: 'right' }}>SGST Amt.</th>
                </> : <>
                  <th style={{ padding: '2px 8px', textAlign: 'right' }}>IGST Amt.</th>
                </>}
                <th style={{ padding: '2px 8px', textAlign: 'right' }}>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {/* Note: this represents aggregate. Using total values for now */}
              <tr>
                <td style={{ padding: '2px 8px' }}>Total</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>-</td>
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmt(invoice.subTotal)}</td>
                {isIntra ? <>
                  <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmt(invoice.totalCGST)}</td>
                  <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmt(invoice.totalSGST)}</td>
                </> : <>
                  <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmt(invoice.totalIGST)}</td>
                </>}
                <td style={{ padding: '2px 8px', textAlign: 'right' }}>{fmt((invoice.totalCGST||0) + (invoice.totalSGST||0) + (invoice.totalIGST||0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Amount in words */}
      <div style={{ padding: '8px', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '13px' }}>
        Rupees {numberToWords(Math.round(grandTotal))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: '60%', padding: '4px 8px', fontSize: '10px', borderRight: '1px solid #000' }}>
          <div style={{ textDecoration: 'underline', fontWeight: 'bold', marginBottom: '4px' }}>Terms & Conditions</div>
          {invoice.terms && (
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
              {invoice.terms}
            </div>
          )}
          
          <div style={{ marginTop: '10px' }}>
             <b>Bank Details:</b><br />
             {bank.bankName && <span>Bank Name: {bank.bankName}<br /></span>}
             {bank.accountNumber && <span>Account Number: {bank.accountNumber}<br /></span>}
             {bank.ifscCode && <span>IFSC Code: {bank.ifscCode}<br /></span>}
             {bank.branch && <span>Branch: {bank.branch}<br /></span>}
          </div>
        </div>
        <div style={{ width: '40%', padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ fontSize: '10px' }}>Receiver's Signature :</span>
          </div>
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>for {company.companyName}</div>
            <div style={{
              margin: '8px 0',
              border: '1px dashed #000',
              padding: '8px 12px',
              background: '#fafafa',
              fontSize: '9px',
              textAlign: 'center',
              lineHeight: '1.4',
              color: '#333',
              maxWidth: '220px',
              display: 'inline-block'
            }}>
              <b>Digitally Signed Document</b><br />
              This is a computer generated {invType.toLowerCase()}, digitally signed, and does not require a physical signature.
            </div>
            <div style={{ fontWeight: 'bold', marginTop: '4px' }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Main Component ───────────────────────────────────────────────
const ClassicTemplate = ({ invoice, company, client, bank, items, hasTax, isIntra, grandTotal, invType }) => {
  const border = '1px solid #000';
  const rowBorder = '1px solid #000';
  const isTdsApplicable = invoice.tds_applicable !== undefined ? invoice.tds_applicable : invoice.tdsApplicable;
  const tdsSection = invoice.tds_section !== undefined ? invoice.tds_section : invoice.tdsSection;
  const tdsRate = invoice.tds_rate !== undefined ? invoice.tds_rate : invoice.tdsRate;
  const tds = Number(invoice.tds_amount !== undefined ? invoice.tds_amount : invoice.tds) || 0;
  const companyPAN = (company.pan || (company.gstin && company.gstin.length >= 12 ? company.gstin.substring(2, 12) : '') || '').toUpperCase();
  const companyAddr = addrStr(company.address);
  const clientAddr = addrStr(client.address);
  const shipAddr = invoice.shippingAddress?.line1
    ? addrStr(invoice.shippingAddress)
    : (client.shippingAddress?.line1 ? addrStr(client.shippingAddress) : clientAddr);
  const safeItems = items.length ? items : [{ name: '', description: '', hsnCode: '', qty: 0, unit: '', rate: 0, discount: 0, amount: 0 }];
  const totalQty = safeItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const summaryUnit = safeItems.find((item) => item.unit)?.unit || 'Units';
  const distinctTaxRates = [...new Set(safeItems.map((item) => Number(item.taxRate) || 0).filter((rate) => rate > 0))];
  const uniformTaxRate = distinctTaxRates.length === 1 ? distinctTaxRates[0] : null;
  const fillerHeight = Math.max(0, 380 - safeItems.length * 72);


  const taxSummaryRows = Object.values(safeItems.reduce((acc, item) => {
    const rate = Number(item.taxRate) || 0;
    const discountPct = Number(item.discount) || 0;
    const qty = Number(item.qty) || 0;
    const unitRate = Number(item.rate) || 0;
    const taxable = qty * unitRate * (1 - discountPct / 100);
    const key = `${item.hsnCode || '-'}__${rate}`;
    if (!acc[key]) {
      acc[key] = {
        hsnCode: item.hsnCode || '-',
        taxRate: rate,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
    }
    acc[key].taxable += taxable;
    acc[key].cgst += Number(item.cgst) || 0;
    acc[key].sgst += Number(item.sgst) || 0;
    acc[key].igst += Number(item.igst) || 0;
    return acc;
  }, {}));

  const adjustmentRows = [
    ...(hasTax && isIntra ? [
      { label: 'Add', name: 'CGST', rate: uniformTaxRate ? `${fmt(uniformTaxRate / 2)} %` : '', amount: Number(invoice.totalCGST) || 0 },
      { label: 'Add', name: 'SGST', rate: uniformTaxRate ? `${fmt(uniformTaxRate / 2)} %` : '', amount: Number(invoice.totalSGST) || 0 },
    ] : []),
    ...(hasTax && !isIntra ? [
      { label: 'Add', name: 'IGST', rate: uniformTaxRate ? `${fmt(uniformTaxRate)} %` : '', amount: Number(invoice.totalIGST) || 0 },
    ] : []),
    ...(Number(invoice.shippingCharges) > 0 ? [
      { label: 'Add', name: 'Shipping', rate: '', amount: Number(invoice.shippingCharges) || 0 },
    ] : []),
    ...(Number(invoice.packagingCharges) > 0 ? [
      { label: 'Add', name: invoice.customChargeLabel || 'Custom Charge', rate: '', amount: Number(invoice.packagingCharges) || 0 },
    ] : []),
    ...(Number(invoice.discountTotal) > 0 ? [
      { label: 'Less', name: 'Discount', rate: '', amount: Number(invoice.discountTotal) || 0 },
    ] : []),
    ...(isTdsApplicable && Number(tds) > 0 ? [
      { label: 'Less', name: `TDS - Sec ${tdsSection || '194C'} (${tdsRate || 0}%)`, rate: '', amount: Number(tds) || 0 }
    ] : []),
  ];

  const detailLine = (label, value, width = 165) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, lineHeight: 1.25 }}>
      <div style={{ width, flexShrink: 0 }}>{label}</div>
      <div style={{ fontWeight: 400 }}>:</div>
      <div style={{ fontWeight: 400 }}>{value || ''}</div>
    </div>
  );

  const tableHead = {
    borderRight: rowBorder,
    borderBottom: rowBorder,
    padding: '8px 6px',
    fontWeight: 700,
    fontSize: 12,
    verticalAlign: 'top',
  };

  const tableCell = {
    borderRight: rowBorder,
    padding: '12px 6px 8px',
    verticalAlign: 'top',
    fontSize: 11,
  };

  return (
    <div
      id="invoice-print-classic"
      className="classic-template"
      style={{
        maxWidth: 800,
        margin: '0 auto',
        background: '#fff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11,
        color: '#111',
        border: border,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px 8px', fontSize: 16, fontWeight: 700 }}>
        <div>GSTIN&nbsp; :&nbsp; {company.gstin || ''}</div>
        <div style={{ fontWeight: 400 }}>Original Copy</div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 24px 10px' }}>
        <div style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 4, marginBottom: 4 }}>
          {invType.toUpperCase()}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', lineHeight: 1.1 }}>
          {company.companyName}
        </div>
        {companyAddr && <div style={{ fontSize: 14, marginTop: 2 }}>{companyAddr}</div>}
        {company.phone && <div style={{ fontSize: 14 }}>{company.phone}</div>}
        {companyPAN && <div style={{ fontSize: 14 }}>PAN : {companyPAN}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: rowBorder, borderBottom: rowBorder }}>
        <div style={{ borderRight: rowBorder, padding: '10px 10px 10px 12px', fontSize: 16 }}>
          {detailLine('Invoice No.', invoice.invoiceNo, 170)}
          {detailLine('Dated', fmtDate(invoice.date), 170)}
        </div>
        <div style={{ padding: '10px 10px 10px 12px', fontSize: 16 }}>
          {detailLine('Place of Supply', invoice.placeOfSupply || client.address?.state || '', 180)}
          {detailLine('Reverse Charge', invoice.reverseCharge ? 'Y' : 'N', 180)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: rowBorder }}>
        <div style={{ borderRight: rowBorder, padding: '10px 10px 8px 12px', minHeight: 150 }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic', marginBottom: 2 }}>Billed to&nbsp;&nbsp;&nbsp; :</div>
          <div style={{ fontSize: 15, lineHeight: 1.25 }}>{client.name || ''}</div>
          <div style={{ fontSize: 15, lineHeight: 1.25, whiteSpace: 'pre-wrap' }}>{clientAddr}</div>
          <div style={{ fontSize: 14, marginTop: 42 }}>{detailLine('GSTIN / UIN', client.gstin || '', 160)}</div>
        </div>
        <div style={{ padding: '10px 10px 8px 12px', minHeight: 150 }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic', marginBottom: 2 }}>Shipped to&nbsp;&nbsp; :</div>
          <div style={{ fontSize: 15, lineHeight: 1.25 }}>{client.name || ''}</div>
          <div style={{ fontSize: 15, lineHeight: 1.25, whiteSpace: 'pre-wrap' }}>{shipAddr}</div>
          <div style={{ fontSize: 14, marginTop: 42 }}>{detailLine('GSTIN / UIN', client.gstin || '', 160)}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...tableHead, width: '3.8%', textAlign: 'center' }}>S.N.</th>
            <th style={{ ...tableHead, width: '26.7%', textAlign: 'left' }}>Description of Goods</th>
            <th style={{ ...tableHead, width: '10%', textAlign: 'left' }}>HSN/SAC<br />Code</th>
            <th style={{ ...tableHead, width: '7%', textAlign: 'right' }}>Qty.</th>
            <th style={{ ...tableHead, width: '6%', textAlign: 'left' }}>Unit</th>
            <th style={{ ...tableHead, width: '11%', textAlign: 'right' }}>List Price</th>
            <th style={{ ...tableHead, width: '9%', textAlign: 'left' }}>Discount</th>
            <th style={{ ...tableHead, width: '11.5%', textAlign: 'right' }}>Price</th>
            <th style={{ ...tableHead, width: '15.0%', textAlign: 'right', borderRight: 'none' }}>Amount(`)</th>
          </tr>
        </thead>
        <tbody>
          {safeItems.map((item, index) => {
            const qty = Number(item.qty) || 0;
            const discountPct = Number(item.discount) || 0;
            const listPrice = Number(item.listPrice ?? item.mrp ?? item.listRate ?? item.listAmount ?? 0) || 0;
            const netUnitPrice = Number(item.rate) || 0;
            const taxable = qty * netUnitPrice * (1 - discountPct / 100);
            const lineAmount = Number(item.amount) || taxable;

            return (
              <tr key={`${item.name || 'item'}-${index}`}>
                <td style={{ ...tableCell, textAlign: 'right' }}>{item.name ? `${index + 1}.` : ''}</td>
                <td style={tableCell}>
                  <div style={{ fontSize: 14, lineHeight: 1.25 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 13, lineHeight: 1.25, marginTop: 4, paddingLeft: 16, whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </div>
                  )}
                </td>
                <td style={{ ...tableCell, fontSize: 13 }}>{item.hsnCode || ''}</td>
                <td style={{ ...tableCell, textAlign: 'right', fontSize: 13 }}>{item.name ? qty.toFixed(2) : ''}</td>
                <td style={{ ...tableCell, fontSize: 13 }}>{item.unit || ''}</td>
                <td style={{ ...tableCell, textAlign: 'right', fontSize: 13 }}>{item.name ? fmt(listPrice) : ''}</td>
                <td style={{ ...tableCell, fontSize: 13 }}>{item.name ? `${fmt(discountPct)}%` : ''}</td>
                <td style={{ ...tableCell, textAlign: 'right', fontSize: 13 }}>{item.name ? fmt(netUnitPrice) : ''}</td>
                <td style={{ ...tableCell, textAlign: 'right', fontSize: 13, borderRight: 'none' }}>{item.name ? fmt(lineAmount) : ''}</td>
              </tr>
            );
          })}
          {fillerHeight > 0 && (
            <tr>
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight }} />
              <td style={{ ...tableCell, height: fillerHeight, borderRight: 'none' }} />
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 15.0%', borderTop: rowBorder, borderBottom: rowBorder }}>
        <div style={{ padding: '0 0 0 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px 96px 114px', minHeight: 94 }}>
            <div />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 10, fontSize: 15, lineHeight: 1.35 }}>
              {adjustmentRows.map((row, index) => (
                <div key={`${row.name}-${index}`}>{row.label}</div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 10, fontSize: 15, lineHeight: 1.35 }}>
              {adjustmentRows.map((row, index) => (
                <div key={`${row.name}-${index}`}>&nbsp;:&nbsp; {row.name}</div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 12px 10px 0', fontSize: 15, lineHeight: 1.35, textAlign: 'right' }}>
              {adjustmentRows.map((row, index) => (
                <div key={`${row.name}-${index}`}>
                  {row.rate ? `@ ${row.rate}` : fmt(Math.abs(row.amount))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderLeft: rowBorder, padding: '10px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700 }}>
          <div>{fmt(Number(invoice.subTotal) || 0)}</div>
          {adjustmentRows.map((row, index) => (
            <div key={`${row.name}-amount-${index}`} style={{ marginTop: 6, fontSize: 16, fontWeight: 400 }}>
              {row.label === 'Less' ? '-' : ''}{fmt(Math.abs(row.amount))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 15.0%', borderBottom: rowBorder }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 42, padding: '10px 16px', fontSize: 17, fontWeight: 700 }}>
          <span>{isTdsApplicable ? "Net Payable" : "Grand Total"}</span>
          <span>{fmt(totalQty)} {summaryUnit}</span>
        </div>
        <div style={{ borderLeft: rowBorder, padding: '10px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700 }}>
          {fmt(isTdsApplicable ? (grandTotal - tds) : grandTotal)}
        </div>
      </div>

      {hasTax && (
        <div style={{ padding: '10px 12px 10px', borderBottom: rowBorder }}>
          <table style={{ width: 'auto', minWidth: '480px', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700 }}>
                  <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>HSN/SAC</span>
                </th>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700 }}>
                  <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>Tax Rate</span>
                </th>
                <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                  <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>Taxable Amt.</span>
                </th>
                {isIntra ? (
                  <>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                      <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>CGST Amt.</span>
                    </th>
                    <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                      <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>SGST Amt.</span>
                    </th>
                  </>
                ) : (
                  <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                    <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>IGST Amt.</span>
                  </th>
                )}
                <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>
                  <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>Total Tax</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(taxSummaryRows.length ? taxSummaryRows : [{
                hsnCode: '-',
                taxRate: uniformTaxRate || 0,
                taxable: Number(invoice.subTotal) || 0,
                cgst: Number(invoice.totalCGST) || 0,
                sgst: Number(invoice.totalSGST) || 0,
                igst: Number(invoice.totalIGST) || 0,
              }]).map((row, index) => {
                return (
                  <tr key={`${row.hsnCode}-${row.taxRate}-${index}`}>
                    <td style={{ padding: '4px 6px', textAlign: 'left' }}>{row.hsnCode}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'left' }}>{row.taxRate ? `${row.taxRate}%` : '-'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(row.taxable)}</td>
                    {isIntra ? (
                      <>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(row.cgst)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(row.sgst)}</td>
                      </>
                    ) : (
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(row.igst)}</td>
                    )}
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt((row.cgst || 0) + (row.sgst || 0) + (row.igst || 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ padding: '12px 12px 10px', fontSize: 16, fontWeight: 700, borderBottom: rowBorder }}>
        Rupees {numberToWords(Math.round(isTdsApplicable ? (grandTotal - tds) : grandTotal))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '44% 56%' }}>
        <div style={{ borderRight: rowBorder, padding: '10px 12px 16px', minHeight: 132 }}>
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 4 }}>
            Terms & Conditions
          </div>
          {invoice.terms && (
            <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
              {invoice.terms}
            </div>
          )}
          {bank && (bank.bankName || bank.accountNumber) && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 4 }}>
                Bank Details
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 2 }}>
                {bank.accountName && <div><b>Account Holder:</b> {bank.accountName.toUpperCase()}</div>}
                {bank.bankName && <div><b>Bank Name:</b> {bank.bankName.toUpperCase()}</div>}
                {bank.accountNumber && <div><b>Account Number:</b> {bank.accountNumber}</div>}
                {bank.branch && <div><b>Branch Name:</b> {bank.branch.toUpperCase()}</div>}
                {bank.ifscCode && <div><b>IFSC Code:</b> {bank.ifscCode}</div>}
              </div>
            </div>
          )}
        </div>
        <div>
          <div style={{ borderBottom: rowBorder, padding: '10px 12px 34px', fontSize: 14, fontWeight: 700 }}>
            Receiver's Signature&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
          </div>
          <div style={{ padding: '14px 18px 10px', minHeight: 82, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>for {company.companyName}</div>
            <div style={{
              margin: '8px 0',
              border: '1px dashed #000',
              padding: '8px 12px',
              background: '#fafafa',
              fontSize: '9px',
              textAlign: 'center',
              lineHeight: '1.4',
              color: '#333',
              maxWidth: '220px'
            }}>
              <b>Digitally Signed Document</b><br />
              This is a computer generated {invType.toLowerCase()}, digitally signed, and does not require a physical signature.
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoicePrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice]   = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [template, setTemplate] = useState('modern');

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
    return () => { document.title = 'Flance'; };
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
  const bank        = invoice.bankDetails || {};
  const items       = invoice.items  || [];
  const invType     = invoice.invoiceType || 'Tax Invoice';
  const hasTax      = invType === 'Tax Invoice' || invType === 'Excise Invoice';
  const hasExcise   = invType === 'Excise Invoice';
  const isIntra     = (Number(invoice.totalIGST) || 0) === 0;
  const hasDiscount = items.some(it => Number(it.discount) > 0);

  const grandTotal  = Number(invoice.grandTotal)  || 0;
  const balanceDue  = Number(invoice.balanceDue)  || 0;
  const advancePaid = Number(invoice.advancePaid) || 0;
  const isTdsApplicable = invoice.tds_applicable !== undefined ? invoice.tds_applicable : invoice.tdsApplicable;
  const tdsSection      = invoice.tds_section !== undefined ? invoice.tds_section : invoice.tdsSection;
  const tdsRate         = invoice.tds_rate !== undefined ? invoice.tds_rate : invoice.tdsRate;
  const tds             = Number(invoice.tds_amount !== undefined ? invoice.tds_amount : invoice.tds) || 0;
  const rounded     = Math.round(grandTotal) - grandTotal;
  const taxRate     = items[0]?.taxRate || 0;
  const amountDue   = advancePaid > 0 || tds > 0 ? balanceDue : grandTotal;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="print-page-container" style={{ background: '#eee', minHeight: '100vh', padding: '0', fontFamily: 'Calibri, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Screen toolbar */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        className="print:hidden">
        <button onClick={() => navigate(-1)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:`1px solid ${BORDER}`, borderRadius:6, background:'#fff', cursor:'pointer', fontSize:13, color:'#333' }}>
          <FaArrowLeft size={13}/> Back
        </button>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={template} 
            onChange={e => setTemplate(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #d0d0d0', fontSize: '13px', outline: 'none', cursor: 'pointer', background: '#fff' }}
          >
            <option value="modern">Modern Template</option>
            <option value="classic">Classic GST Template</option>
          </select>
          
          <button onClick={() => window.print()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 20px', background:TEAL, color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:400 }}>
            <FaPrint size={13}/> Print / Download
          </button>
        </div>
      </div>

      <div style={{ paddingBottom: '40px' }}>
        {template === 'modern' ? (
          <ModernTemplate 
            invoice={invoice} company={company} client={client} bank={bank} items={items}
            hasTax={hasTax} isIntra={isIntra} hasExcise={hasExcise} hasDiscount={hasDiscount}
            grandTotal={grandTotal} amountDue={amountDue} rounded={rounded} balanceDue={balanceDue}
            advancePaid={advancePaid} tds={tds} taxRate={taxRate} invType={invType}
          />
        ) : (
          <ClassicTemplate 
            invoice={invoice} company={company} client={client} bank={bank} items={items}
            hasTax={hasTax} isIntra={isIntra} hasExcise={hasExcise} hasDiscount={hasDiscount}
            grandTotal={grandTotal} amountDue={amountDue} rounded={rounded} balanceDue={balanceDue}
            advancePaid={advancePaid} tds={tds} taxRate={taxRate} invType={invType}
          />
        )}
      </div>

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
          #invoice-print-modern, #invoice-print-classic, #doc-print { 
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

export default InvoicePrint;
