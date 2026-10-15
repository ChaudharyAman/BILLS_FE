import React from 'react';

/**
 * Number to Indian words converter
 */
function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };
  return (inWords(Math.floor(num)) + ' Only').trim();
}

const fmt = (num) => (Number(num) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${String(dt.getDate()).padStart(2, '0')}-${dt.toLocaleString('en-IN', { month: 'short' })}-${dt.getFullYear()}`;
};

const addrStr = (a) => {
  if (!a) return '';
  if (typeof a === 'string') return a;
  const parts = [a.line1, a.line2, a.city, a.state, a.zip, a.country].filter(Boolean);
  return parts.join(', ');
};

/**
 * LogisticsPrintTemplate
 * Exact Indian Freight Forwarding & Cargo Tax Invoice layout.
 */
const LogisticsPrintTemplate = ({
  invoice = {},
  company = {},
  client = {},
  bank = {},
  items = [],
  isIntra = true,
  grandTotal = 0,
  rounded = 0,
  invType = 'Tax Invoice',
}) => {
  const logistics = invoice.logistics || invoice.transport || {};
  const companyAddr = addrStr(company.address);
  const clientAddr = addrStr(client.address || invoice.billingAddress);
  const companyPAN = (company.pan || (company.gstin && company.gstin.length >= 12 ? company.gstin.substring(2, 12) : '') || '').toUpperCase();
  const companyStateCode = company.gstin ? company.gstin.substring(0, 2) : '07';
  const clientStateCode = client.gstin ? client.gstin.substring(0, 2) : '';

  // Tax Slabs Summary
  const taxSummaryMap = {};
  items.forEach(it => {
    const isExempt = Boolean(it.isTaxExempt) || (it.taxableAmount === 0 && Number(it.taxRate) === 0);
    const rate = isExempt ? 0 : Number(it.taxRate || it.gstRate || 0);
    const sac = it.hsnCode || '996531';
    const key = `${sac}__${rate}`;
    const qty = Number(it.qty) || 1;
    const unitRate = Number(it.rate) || 0;
    const rowBase = (Number(it.foreignRate) > 0 && Number(it.exRate) > 0)
      ? Number((Number(it.foreignRate) * Number(it.exRate) * qty).toFixed(2))
      : Number((unitRate * qty).toFixed(2));
    const taxable = isExempt
      ? 0
      : (it.taxableAmount !== undefined && it.taxableAmount !== null && Number(it.taxableAmount) >= 0
          ? Number(it.taxableAmount)
          : rowBase);
    const cgst = Number(it.cgst) || (isIntra && !isExempt ? Number((taxable * (rate / 2) / 100).toFixed(2)) : 0);
    const sgst = Number(it.sgst) || (isIntra && !isExempt ? Number((taxable * (rate / 2) / 100).toFixed(2)) : 0);
    const igst = Number(it.igst) || (!isIntra && !isExempt ? Number((taxable * rate / 100).toFixed(2)) : 0);

    if (!taxSummaryMap[key]) {
      taxSummaryMap[key] = { sac, rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    }
    taxSummaryMap[key].taxable += taxable;
    taxSummaryMap[key].cgst += cgst;
    taxSummaryMap[key].sgst += sgst;
    taxSummaryMap[key].igst += igst;
    taxSummaryMap[key].totalTax += (cgst + sgst + igst);
  });

  const taxSummaryRows = Object.values(taxSummaryMap);
  const totalTaxableBase = taxSummaryRows.reduce((sum, r) => sum + r.taxable, 0);
  const foreignItem = items.find(it => it.currency && it.currency !== 'INR' && Number(it.exRate) > 1);

  // Border styles
  const bdr = '1px solid #000';
  const lightBdr = '1px solid #cbd5e1';

  return (
    <div
      id="invoice-print-logistics"
      className="logistics-template"
      style={{
        maxWidth: 880,
        margin: '0 auto',
        background: '#fff',
        fontFamily: 'Calibri, Arial, sans-serif',
        fontSize: '11px',
        color: '#000',
        border: bdr,
        boxSizing: 'border-box',
        lineHeight: 1.3,
      }}
    >
      {/* ── Top Header Banner: TAX INVOICE ── */}
      <div
        style={{
          textAlign: 'center',
          fontWeight: 900,
          fontSize: '14px',
          textTransform: 'uppercase',
          padding: '4px',
          borderBottom: bdr,
          letterSpacing: '1px',
          background: '#fff',
        }}
      >
        {invType.toUpperCase() || 'TAX INVOICE'}
      </div>

      {/* ── Section 1: Company Particulars (Left) & Transport Matrix Rows 1-7 (Right) ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: bdr }}>
        <tbody>
          <tr>
            {/* Left Column (44%): Logo + Company Particulars + Shipper */}
            <td style={{ width: '44%', verticalAlign: 'top', borderRight: bdr, padding: 0 }}>
              <div style={{ padding: '8px 12px' }}>
                {company.logoUrl && (
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <img
                      src={company.logoUrl}
                      alt="Company Logo"
                      style={{ maxHeight: 60, maxWidth: '90%', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', marginBottom: 3 }}>
                  {company.companyName || 'COMPLETE CARGO SOLUTIONS PVT LTD'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#111', marginBottom: 3 }}>
                  {companyAddr || '7/112, UGF, GEETA COLONY ROAD, EAST DELHI, NEW DELHI-110031'}
                </div>
                <div style={{ fontSize: '10.5px', lineHeight: 1.45 }}>
                  <div><b>GSTIN :</b> {company.gstin || '07AANCC8618C1ZL'}</div>
                  {company.msme && <div><b>MSME :</b> {company.msme}</div>}
                  {company.cin && <div><b>CIN :</b> {company.cin}</div>}
                  {company.tan && <div><b>TAN NO :</b> {company.tan}</div>}
                  {companyPAN && <div><b>PAN :</b> {companyPAN}</div>}
                  {(company.phone || company.contactNo) && (
                    <div><b>Contact No :</b> {company.phone || company.contactNo}</div>
                  )}
                  {company.email && <div><b>E-mail :</b> {company.email}</div>}
                </div>
              </div>

              {/* Shipper Details (if present) */}
              {logistics.shipperName && (
                <div style={{ borderTop: bdr, padding: '6px 12px', background: '#fafbfc' }}>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: 600 }}>
                    Shipper / Consignor Details :
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                    {logistics.shipperName}
                  </div>
                  <div style={{ fontSize: '10px', color: '#222' }}>
                    {logistics.shipperAddress || '—'}
                  </div>
                  {logistics.shipperCountry && (
                    <div style={{ fontSize: '10px' }}><b>Country :</b> {logistics.shipperCountry}</div>
                  )}
                </div>
              )}
            </td>

            {/* Right Column (56%): Key Transport Matrix Rows 1 to 7 */}
            <td style={{ width: '56%', verticalAlign: 'top', padding: 0 }}>
              <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <tbody>
                  {/* Row 1: Invoice No. & Dated */}
                  <tr style={{ borderBottom: bdr }}>
                    <td style={{ width: '50%', padding: '4px 8px', borderRight: bdr, verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#555' }}>Invoice No.</div>
                      <div style={{ fontWeight: 800, fontSize: '12px', marginTop: 1 }}>{invoice.invoiceNo || 'INV-0001'}</div>
                    </td>
                    <td style={{ width: '50%', padding: '4px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#555' }}>Dated</div>
                      <div style={{ fontWeight: 800, fontSize: '12px', marginTop: 1 }}>{fmtDate(invoice.date)}</div>
                      {invoice.dueDate && (
                        <div style={{ fontSize: '9.5px', color: '#555', marginTop: 1 }}>
                          <b>Due:</b> {fmtDate(invoice.dueDate)}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Row 2: Delivery Note & Mode/Terms of Payment */}
                  <tr style={{ borderBottom: bdr }}>
                    <td style={{ padding: '4px 8px', borderRight: bdr, verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#555' }}>Delivery Note</div>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>{logistics.deliveryNote || '---'}</div>
                    </td>
                    <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#555', fontWeight: 700 }}>Mode/Terms of Payment</div>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>
                        {[invoice.paymentMode, invoice.paymentTerms || 'As per Contract'].filter(Boolean).join(' / ')}
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: SB No / BE No & Other Reference(s) */}
                  <tr style={{ borderBottom: bdr }}>
                    <td style={{ padding: '4px 8px', borderRight: bdr, verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#000', fontWeight: 700 }}>SB No / BE No</div>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>
                        {logistics.sbNo || '---'} {logistics.sbDate ? `(${fmtDate(logistics.sbDate)})` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#555' }}>Other Reference(s)</div>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>
                        {[
                          logistics.otherReferences,
                          invoice.poNumber ? `PO: ${invoice.poNumber}${invoice.poDate ? ' (' + fmtDate(invoice.poDate) + ')' : ''}` : '',
                          logistics.exporterInvNo ? `Exp: ${logistics.exporterInvNo}${logistics.exporterInvDate ? ' (' + fmtDate(logistics.exporterInvDate) + ')' : ''}` : '',
                          logistics.jobRef ? `Job: ${logistics.jobRef}` : '',
                        ].filter(Boolean).join(' / ') || '---'}
                      </div>
                    </td>
                  </tr>

                  {/* Row 4 & 5: MAWN / HBL No & Gross / Chargeable Weight */}
                  <tr style={{ borderBottom: bdr }}>
                    <td rowSpan={2} style={{ padding: '4px 8px', borderRight: bdr, verticalAlign: 'top' }}>
                      <div style={{ fontSize: '9.5px', color: '#000', fontWeight: 700 }}>MAWN /HBL No</div>
                      <div style={{ fontWeight: 800, fontSize: '11px', marginTop: 2 }}>
                        {[logistics.mblNo, logistics.hblNo].filter(Boolean).join(' / ') || '---'}
                      </div>
                      {(logistics.mblDate || logistics.hblDate) && (
                        <div style={{ fontSize: '9px', color: '#555', marginTop: 1 }}>
                          ({[logistics.mblDate ? fmtDate(logistics.mblDate) : '', logistics.hblDate ? fmtDate(logistics.hblDate) : ''].filter(Boolean).join(' / ')})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: lightBdr, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Gross Weight :</span>
                      <span style={{ fontWeight: 600 }}>
                        {logistics.grossWeight || '---'}
                        {logistics.netWeight && (
                          <span style={{ fontSize: '9px', color: '#555', marginLeft: 4 }}>
                            (Net: {logistics.netWeight})
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: bdr }}>
                    <td style={{ padding: '3px 8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700 }}>Chargable Weight :</span>
                      <span style={{ fontWeight: 800 }}>{logistics.chargeableWeight || logistics.grossWeight || '---'}</span>
                    </td>
                  </tr>

                  {/* Row 6: No of Packages & Port of Loading */}
                  <tr style={{ borderBottom: bdr }}>
                    <td style={{ padding: '4px 8px', borderRight: bdr }}>
                      <span style={{ fontWeight: 700 }}>No of Packages :</span>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>{logistics.packages || '---'}</div>
                    </td>
                    <td style={{ padding: '3px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Port of Loading :</span>
                      <span style={{ fontWeight: 600 }}>{logistics.portOfLoading || '---'}</span>
                    </td>
                  </tr>

                  {/* Row 7: Despatched through & Port of Destination */}
                  <tr>
                    <td style={{ padding: '4px 8px', borderRight: bdr }}>
                      <span style={{ fontWeight: 700 }}>Despatched through</span>
                      <div style={{ fontWeight: 600, marginTop: 1 }}>
                        {[
                          logistics.shippingLine ? `Carrier: ${logistics.shippingLine}` : '',
                          logistics.despatchedThrough,
                          [logistics.vesselName, logistics.flightNo ? `Voy/Flt: ${logistics.flightNo}` : ''].filter(Boolean).join(' '),
                        ].filter(Boolean).join(' - ') || '---'}
                      </div>
                    </td>
                    <td style={{ padding: '3px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Port of Destination :</span>
                      <span style={{ fontWeight: 600 }}>{[logistics.portOfDischarge, logistics.finalDestination].filter(Boolean).join(' / ') || '---'}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Section 2: Bill To (Left 44%) & Terms of Delivery / Description (Right 28% + 28%) ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: bdr }}>
        <tbody>
          <tr>
            {/* Bill To : Consignee (44%) */}
            <td style={{ width: '44%', verticalAlign: 'top', borderRight: bdr, padding: '8px 12px' }}>
              <div style={{ fontSize: '10.5px', color: '#444', marginBottom: 2 }}>
                Bill To :
              </div>
              <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', color: '#000' }}>
                {client.name || 'SPEED MAX LOGISTICS'}
              </div>
              <div style={{ fontSize: '10px', color: '#222', marginTop: 2 }}>
                {clientAddr || 'KH NO 835, BLOCK K-2 , NEAR MATA CHOWK MAHIPALPUR EXTENTION'}
              </div>
              <div style={{ fontSize: '10px', marginTop: 4, lineHeight: 1.4 }}>
                <div><b>GSTIN:</b> {client.gstin || 'Unregistered'}</div>
                {client.address?.state && (
                  <div><b>State:</b> {client.address?.state} {clientStateCode ? `(Code: ${clientStateCode})` : ''}</div>
                )}
                {invoice.placeOfSupply && (
                  <div><b>Place of Supply:</b> {invoice.placeOfSupply}</div>
                )}
                {invoice.reverseCharge && (
                  <div><b>Reverse Charge:</b> Yes</div>
                )}
              </div>
            </td>

            {/* Terms of Delivery (28% = left half of right 56%) */}
            <td style={{ width: '28%', verticalAlign: 'top', borderRight: bdr, padding: '6px 8px' }}>
              <span style={{ fontSize: '9.5px', color: '#555' }}>Terms of Delivery</span>
              <div style={{ fontWeight: 700, fontSize: '11px', marginTop: 2 }}>
                {logistics.termsOfDelivery || '---'}
              </div>
            </td>

            {/* Description & Cargo Details (28% = right half of right 56%) */}
            <td style={{ width: '28%', verticalAlign: 'top', padding: '6px 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Description :</span>
                <span style={{ fontWeight: 600 }}>{logistics.cargoDescription || 'Other'}</span>
              </div>
              {(logistics.containerNo || logistics.vehicleNo) && (
                <div style={{ fontSize: '9.5px', color: '#333', marginTop: 2 }}>
                  <b>Cont/Veh:</b> {[logistics.containerNo, logistics.vehicleNo].filter(Boolean).join(' / ')}
                </div>
              )}
              {logistics.cbm && (
                <div style={{ fontSize: '9.5px', color: '#333', marginTop: 1 }}>
                  <b>CBM:</b> {logistics.cbm}
                </div>
              )}
              {logistics.netWeight && (
                <div style={{ fontSize: '9.5px', color: '#333', marginTop: 1 }}>
                  <b>Net Wt:</b> {logistics.netWeight}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Table of Goods / Services ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: bdr, background: '#fff' }}>
            <th style={{ borderRight: bdr, padding: '5px 4px', width: '35px', textAlign: 'center', fontWeight: 800 }}>SI No.</th>
            <th style={{ borderRight: bdr, padding: '5px 8px', textAlign: 'left', fontWeight: 800 }}>Description of Goods/Services</th>
            <th style={{ borderRight: bdr, padding: '5px 6px', width: '75px', textAlign: 'center', fontWeight: 800 }}>HSN/SAC</th>
            <th style={{ borderRight: bdr, padding: '5px 6px', width: '65px', textAlign: 'right', fontWeight: 800 }}>Quantity</th>
            <th style={{ borderRight: bdr, padding: '5px 8px', width: '75px', textAlign: 'right', fontWeight: 800 }}>Rate</th>
            <th style={{ borderRight: bdr, padding: '5px 6px', width: '45px', textAlign: 'center', fontWeight: 800 }}>per</th>
            <th style={{ padding: '5px 8px', width: '100px', textAlign: 'right', fontWeight: 800 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const isExempt = Boolean(it.isTaxExempt) || (it.taxableAmount === 0 && Number(it.taxRate) === 0);
            const qty = Number(it.qty) || 1;
            const rate = Number(it.rate) || 0;
            const foreignRate = Number(it.foreignRate) || 0;
            const exRate = Number(it.exRate) || 1;
            const currency = it.currency || 'INR';
            const rowAmount = (foreignRate > 0 && exRate > 0)
              ? Number((foreignRate * exRate * qty).toFixed(2))
              : Number((rate * qty).toFixed(2));
            const unit = it.unit || 'Kg';

            return (
              <tr key={idx} style={{ borderBottom: idx === items.length - 1 ? bdr : lightBdr }}>
                <td style={{ borderRight: bdr, padding: '6px 4px', textAlign: 'center', verticalAlign: 'top', fontWeight: 700 }}>
                  {idx + 1}
                </td>
                <td style={{ borderRight: bdr, padding: '6px 8px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#000' }}>
                    {it.name || 'Freight Service'}
                  </div>
                  {it.description && it.description !== it.name && (
                    <div style={{ fontSize: '9.5px', color: '#444', marginTop: 1 }}>
                      {it.description}
                    </div>
                  )}
                  {currency !== 'INR' && foreignRate > 0 && (
                    <div style={{ fontSize: '9.5px', color: '#0284c7', marginTop: 2, fontWeight: 600 }}>
                      {currency} {fmt(foreignRate)} @ Ex. Rate {exRate.toFixed(2)}
                    </div>
                  )}
                  {isExempt && (
                    <span style={{ display: 'inline-block', fontSize: '8.5px', background: '#fef3c7', color: '#92400e', padding: '1px 4px', borderRadius: 2, fontWeight: 700, marginTop: 2 }}>
                      GST Exempt (0%)
                    </span>
                  )}
                </td>
                <td style={{ borderRight: bdr, padding: '6px 6px', textAlign: 'center', verticalAlign: 'top', fontWeight: 800 }}>
                  {it.hsnCode || '996531'}
                </td>
                <td style={{ borderRight: bdr, padding: '6px 6px', textAlign: 'right', verticalAlign: 'top', fontWeight: 800 }}>
                  {qty}
                </td>
                <td style={{ borderRight: bdr, padding: '6px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                  {fmt(foreignRate > 0 ? foreignRate : rate)}
                </td>
                <td style={{ borderRight: bdr, padding: '6px 6px', textAlign: 'center', verticalAlign: 'top', color: '#333' }}>
                  {unit}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 800 }}>
                  {fmt(rowAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Exchange Rate Notice (if foreign currency used) ── */}
      {foreignItem && (
        <div style={{ padding: '4px 10px', background: '#f8fafc', borderBottom: bdr, fontStyle: 'italic', fontWeight: 700, fontSize: '10px' }}>
          Exchange Rate 1 {foreignItem.currency} @ Rs {Number(foreignItem.exRate).toFixed(2)}
        </div>
      )}

      {/* ── GST Tax Slabs & Summary Breakdown ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', borderBottom: bdr }}>
        {/* Left: GST Tax Slabs Summary */}
        <div style={{ borderRight: bdr, padding: '6px 8px' }}>
          <div style={{ fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', marginBottom: 4, color: '#000' }}>
            GST Tax Slabs & Exemption Summary
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ borderBottom: bdr, background: '#f8fafc', fontWeight: 800 }}>
                <th style={{ padding: '3px 4px', textAlign: 'left' }}>SAC</th>
                <th style={{ padding: '3px 4px', textAlign: 'center' }}>Rate</th>
                <th style={{ padding: '3px 4px', textAlign: 'right' }}>Taxable (₹)</th>
                {isIntra ? (
                  <>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>CGST (₹)</th>
                    <th style={{ padding: '3px 4px', textAlign: 'right' }}>SGST (₹)</th>
                  </>
                ) : (
                  <th style={{ padding: '3px 4px', textAlign: 'right' }}>IGST (₹)</th>
                )}
                <th style={{ padding: '3px 4px', textAlign: 'right' }}>Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {taxSummaryRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: lightBdr }}>
                  <td style={{ padding: '3px 4px', fontWeight: 600 }}>{r.sac}</td>
                  <td style={{ padding: '3px 4px', textAlign: 'center' }}>{r.rate}%</td>
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>{fmt(r.taxable)}</td>
                  {isIntra ? (
                    <>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>{fmt(r.cgst)}</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>{fmt(r.sgst)}</td>
                    </>
                  ) : (
                    <td style={{ padding: '3px 4px', textAlign: 'right' }}>{fmt(r.igst)}</td>
                  )}
                  <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 700 }}>{fmt(r.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: Pre-Tax Subtotal, GST Totals, Grand Total */}
        <div style={{ padding: '6px 12px', fontSize: '11px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2.5px 0', color: '#444' }}>Pre-Tax Subtotal</td>
                <td style={{ padding: '2.5px 0', textAlign: 'right', fontWeight: 700 }}>₹ {fmt(invoice.subTotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: '2.5px 0', color: '#444' }}>Total Taxable Value</td>
                <td style={{ padding: '2.5px 0', textAlign: 'right', fontWeight: 600 }}>₹ {fmt(totalTaxableBase)}</td>
              </tr>
              {isIntra ? (
                <>
                  <tr>
                    <td style={{ padding: '2.5px 0', color: '#444' }}>Total CGST</td>
                    <td style={{ padding: '2.5px 0', textAlign: 'right' }}>₹ {fmt(invoice.totalCGST)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2.5px 0', color: '#444' }}>Total SGST</td>
                    <td style={{ padding: '2.5px 0', textAlign: 'right' }}>₹ {fmt(invoice.totalSGST)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td style={{ padding: '2.5px 0', color: '#444' }}>Total IGST</td>
                  <td style={{ padding: '2.5px 0', textAlign: 'right' }}>₹ {fmt(invoice.totalIGST)}</td>
                </tr>
              )}
              {Number(invoice.shippingCharges) > 0 && (
                <tr>
                  <td style={{ padding: '2.5px 0', color: '#444' }}>Shipping / Delivery</td>
                  <td style={{ padding: '2.5px 0', textAlign: 'right' }}>₹ {fmt(invoice.shippingCharges)}</td>
                </tr>
              )}
              {Number(invoice.packagingCharges) > 0 && (
                <tr>
                  <td style={{ padding: '2.5px 0', color: '#444' }}>{invoice.customChargeLabel || 'Custom Amount'}</td>
                  <td style={{ padding: '2.5px 0', textAlign: 'right' }}>₹ {fmt(invoice.packagingCharges)}</td>
                </tr>
              )}
              {Number(invoice.discountTotal) > 0 && (
                <tr>
                  <td style={{ padding: '2.5px 0', color: '#059669' }}>Discount</td>
                  <td style={{ padding: '2.5px 0', textAlign: 'right', color: '#059669' }}>- ₹ {fmt(invoice.discountTotal)}</td>
                </tr>
              )}
              {rounded !== 0 && (
                <tr>
                  <td style={{ padding: '2.5px 0', color: '#444' }}>Round Off</td>
                  <td style={{ padding: '2.5px 0', textAlign: 'right' }}>{rounded > 0 ? '+' : ''}{rounded.toFixed(2)}</td>
                </tr>
              )}
              <tr style={{ borderTop: bdr }}>
                <td style={{ padding: '6px 0 2px 0', fontWeight: 800, fontSize: '13px' }}>Invoice Total (INR)</td>
                <td style={{ padding: '6px 0 2px 0', textAlign: 'right', fontWeight: 900, fontSize: '14px' }}>
                  ₹ {fmt(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Amount in Words ── */}
      <div style={{ padding: '5px 12px', borderBottom: bdr, background: '#fafbfc', fontWeight: 700, fontSize: '10.5px' }}>
        Amount Chargeable (in words): Rupees {numberToWords(Math.round(grandTotal))}
      </div>

      {/* ── Remittance Bank Details & Signatures ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 45%' }}>
        {/* Bank Particulars */}
        <div style={{ borderRight: bdr, padding: '8px 12px', fontSize: '10px' }}>
          <div style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>
            Bank Remittance Details
          </div>
          {bank && (bank.bankName || bank.accountNumber) ? (
            <div style={{ lineHeight: 1.45, color: '#111' }}>
              <div>A/C Name: <b>{(bank.accountName || company.companyName || '').toUpperCase()}</b></div>
              <div>Bank: <b>{(bank.bankName || '').toUpperCase()}</b></div>
              <div>A/C No: <b style={{ fontFamily: 'monospace', fontSize: '11px' }}>{bank.accountNumber}</b></div>
              {bank.branch && <div>Branch: <b>{bank.branch}</b></div>}
              <div>IFSC: <b style={{ fontFamily: 'monospace', fontSize: '11px' }}>{bank.ifscCode}</b></div>
            </div>
          ) : (
            <div style={{ color: '#888', fontStyle: 'italic' }}>Bank details not configured in Settings</div>
          )}
          {invoice.terms && (
            <div style={{ marginTop: 6, color: '#444', borderTop: lightBdr, paddingTop: 4 }}>
              <b>Terms & Conditions:</b> {invoice.terms}
            </div>
          )}
        </div>

        {/* Declaration & Signatory */}
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
            For {company.companyName || 'COMPLETE CARGO SOLUTIONS PVT LTD'}
          </div>
          <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic', margin: '20px 0 6px 0', textAlign: 'center' }}>
            This is a computer generated invoice and does not require physical signature.
          </div>
          <div style={{ borderTop: '1px dashed #666', paddingTop: 3, fontWeight: 700, fontSize: '10.5px' }}>
            Authorised Signatory
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsPrintTemplate;
