import React from 'react';

function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ` ${a[n % 10]}` : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ` ${inWords(n % 100)}` : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ` ${inWords(n % 1000)}` : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ` ${inWords(n % 100000)}` : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ` ${inWords(n % 10000000)}` : '');
  };
  return (inWords(Math.floor(num)) + ' Only').trim();
}

const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};

const formatAddress = (a) => {
  if (!a) return '';
  if (typeof a === 'string') return a;
  return [
    a.line1,
    a.line2,
    [a.city, a.state, a.zip].filter(Boolean).join(', '),
    a.country,
  ].filter(Boolean).join(', ');
};

const getPan = (company = {}) => (
  company.pan
  || (company.gstin && company.gstin.length >= 12 ? company.gstin.substring(2, 12) : '')
  || ''
).toUpperCase();

const summarizeTaxes = (items = []) => Object.values(items.reduce((acc, item) => {
  const taxRate = Number(item.taxRate) || 0;
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const discount = Number(item.discount) || 0;
  const taxable = qty * rate * (1 - discount / 100);
  const key = `${item.hsnCode || '-'}__${taxRate}`;
  if (!acc[key]) {
    acc[key] = {
      hsnCode: item.hsnCode || '-',
      taxRate,
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

const PartyBlock = ({ title, party, name, gstLabel = 'GSTIN / UIN' }) => {
  const partyName = name || party?.name || '';
  const address = formatAddress(party?.address || party);
  const gstin = party?.gstin || '';
  return (
    <>
      <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.25 }}>{partyName}</div>
      <div style={{ fontSize: 15, lineHeight: 1.25, whiteSpace: 'pre-wrap' }}>{address}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 42, fontSize: 14 }}>
        <div style={{ width: 150 }}>{gstLabel}</div>
        <div>:</div>
        <div>{gstin}</div>
      </div>
    </>
  );
};

const ClassicBusinessDocumentPrint = ({
  documentTitle,
  documentNumberLabel,
  documentNumber,
  company,
  leftPartyTitle,
  leftParty,
  rightPartyTitle,
  rightParty,
  leftPartyName,
  rightPartyName,
  documentDate,
  validUntil,
  placeOfSupply,
  reverseCharge,
  items = [],
  hasTax,
  isIntra,
  subTotal,
  totalCGST,
  totalSGST,
  totalIGST,
  shippingCharges,
  packagingCharges,
  customChargeLabel,
  discountTotal,
  grandTotal,
  terms,
  notes,
}) => {
  const border = '1px solid #000';
  const rowBorder = '1px solid #000';
  const safeItems = items.length ? items : [{ name: '', description: '', hsnCode: '', qty: 0, unit: '', rate: 0, discount: 0 }];
  const totalQty = safeItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const unitLabel = safeItems.find((item) => item.unit)?.unit || 'Units';
  const taxRates = [...new Set(safeItems.map((item) => Number(item.taxRate) || 0).filter(Boolean))];
  const uniformTaxRate = taxRates.length === 1 ? taxRates[0] : null;
  const fillerHeight = Math.max(0, 380 - safeItems.length * 72);
  const companyPan = getPan(company);
  const companyAddress = formatAddress(company?.address);
  const termLines = (terms || '').trim()
    ? terms.split(/\r?\n/).filter(Boolean)
    : [];
  const taxSummaryRows = summarizeTaxes(safeItems);
  const adjustmentRows = [
    ...(hasTax && isIntra ? [
      { label: 'Add', name: 'CGST', rate: uniformTaxRate ? `${fmt(uniformTaxRate / 2)} %` : '', amount: Number(totalCGST) || 0 },
      { label: 'Add', name: 'SGST', rate: uniformTaxRate ? `${fmt(uniformTaxRate / 2)} %` : '', amount: Number(totalSGST) || 0 },
    ] : []),
    ...(hasTax && !isIntra ? [
      { label: 'Add', name: 'IGST', rate: uniformTaxRate ? `${fmt(uniformTaxRate)} %` : '', amount: Number(totalIGST) || 0 },
    ] : []),
    ...(Number(shippingCharges) > 0 ? [
      { label: 'Add', name: 'Shipping', rate: '', amount: Number(shippingCharges) || 0 },
    ] : []),
    ...(Number(packagingCharges) > 0 ? [
      { label: 'Add', name: customChargeLabel || 'Custom Charge', rate: '', amount: Number(packagingCharges) || 0 },
    ] : []),
    ...(Number(discountTotal) > 0 ? [
      { label: 'Less', name: 'Discount', rate: '', amount: Number(discountTotal) || 0 },
    ] : []),
  ];

  const th = {
    borderRight: rowBorder,
    borderBottom: rowBorder,
    padding: '8px 6px',
    fontWeight: 700,
    fontSize: 12,
    verticalAlign: 'top',
  };
  const td = {
    borderRight: rowBorder,
    padding: '12px 6px 8px',
    verticalAlign: 'top',
    fontSize: 11,
  };

  const detailLine = (label, value, width = 170) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, lineHeight: 1.25 }}>
      <div style={{ width, flexShrink: 0 }}>{label}</div>
      <div>:</div>
      <div>{value || ''}</div>
    </div>
  );

  return (
    <div
      id="doc-print"
      style={{
        maxWidth: 800,
        margin: '0 auto',
        background: '#fff',
        boxShadow: '0 2px 20px rgba(0,0,0,0.12)',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11,
        color: '#111',
        border: border,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px 8px', fontSize: 16, fontWeight: 700 }}>
        <div>GSTIN&nbsp; :&nbsp; {company?.gstin || ''}</div>
        <div style={{ fontWeight: 400 }}>Original Copy</div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 24px 10px' }}>
        <div style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 4, marginBottom: 4 }}>
          {documentTitle}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', lineHeight: 1.1 }}>
          {company?.companyName}
        </div>
        {companyAddress && <div style={{ fontSize: 14, marginTop: 2 }}>{companyAddress}</div>}
        {company?.phone && <div style={{ fontSize: 14 }}>{company.phone}</div>}
        {companyPan && <div style={{ fontSize: 14 }}>PAN : {companyPan}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: rowBorder, borderBottom: rowBorder }}>
        <div style={{ borderRight: rowBorder, padding: '10px 10px 10px 12px', fontSize: 16 }}>
          {detailLine(documentNumberLabel, documentNumber, 170)}
          {detailLine('Dated', fmtDate(documentDate), 170)}
        </div>
        <div style={{ padding: '10px 10px 10px 12px', fontSize: 16 }}>
          {detailLine('Place of Supply', placeOfSupply || '', 180)}
          {detailLine('Reverse Charge', reverseCharge ? 'Y' : 'N', 180)}
          {validUntil ? detailLine('Valid Until', fmtDate(validUntil), 180) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: rowBorder }}>
        <div style={{ borderRight: rowBorder, padding: '10px 10px 8px 12px', minHeight: 150 }}>
          <PartyBlock title={leftPartyTitle} party={leftParty} name={leftPartyName} />
        </div>
        <div style={{ padding: '10px 10px 8px 12px', minHeight: 150 }}>
          <PartyBlock title={rightPartyTitle} party={rightParty} name={rightPartyName} />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '3.8%', textAlign: 'center' }}>S.N.</th>
            <th style={{ ...th, width: '26.7%', textAlign: 'left' }}>Description of Goods</th>
            <th style={{ ...th, width: '10%', textAlign: 'left' }}>HSN/SAC<br />Code</th>
            <th style={{ ...th, width: '7%', textAlign: 'right' }}>Qty.</th>
            <th style={{ ...th, width: '6%', textAlign: 'left' }}>Unit</th>
            <th style={{ ...th, width: '11%', textAlign: 'right' }}>List Price</th>
            <th style={{ ...th, width: '9%', textAlign: 'left' }}>Discount</th>
            <th style={{ ...th, width: '11.5%', textAlign: 'right' }}>Price</th>
            <th style={{ ...th, width: '15.0%', textAlign: 'right', borderRight: 'none' }}>Amount(`)</th>
          </tr>
        </thead>
        <tbody>
          {safeItems.map((item, index) => {
            const qty = Number(item.qty) || 0;
            const listPrice = Number(item.listPrice ?? item.rate) || 0;
            const price = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const taxable = qty * price * (1 - discount / 100);

            return (
              <tr key={`${item.name || 'item'}-${index}`}>
                <td style={{ ...td, textAlign: 'right' }}>{item.name ? `${index + 1}.` : ''}</td>
                <td style={td}>
                  <div style={{ fontSize: 14, lineHeight: 1.25 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 13, lineHeight: 1.25, marginTop: 4, paddingLeft: 16, whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </div>
                  )}
                </td>
                <td style={{ ...td, fontSize: 13 }}>{item.hsnCode || ''}</td>
                <td style={{ ...td, textAlign: 'right', fontSize: 13 }}>{item.name ? qty.toFixed(2) : ''}</td>
                <td style={{ ...td, fontSize: 13 }}>{item.unit || ''}</td>
                <td style={{ ...td, textAlign: 'right', fontSize: 13 }}>{item.name ? fmt(listPrice) : ''}</td>
                <td style={{ ...td, fontSize: 13 }}>{item.name ? `${fmt(discount)}%` : ''}</td>
                <td style={{ ...td, textAlign: 'right', fontSize: 13 }}>{item.name ? fmt(price) : ''}</td>
                <td style={{ ...td, textAlign: 'right', fontSize: 13, borderRight: 'none' }}>{item.name ? fmt(taxable) : ''}</td>
              </tr>
            );
          })}
          {fillerHeight > 0 && (
            <tr>
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight }} />
              <td style={{ ...td, height: fillerHeight, borderRight: 'none' }} />
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
          <div>{fmt(Number(subTotal) || 0)}</div>
          {adjustmentRows.map((row, index) => (
            <div key={`${row.name}-amount-${index}`} style={{ marginTop: 6, fontSize: 16, fontWeight: 400 }}>
              {row.label === 'Less' ? '-' : ''}{fmt(Math.abs(row.amount))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 15.0%', borderBottom: rowBorder }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 42, padding: '10px 16px', fontSize: 17, fontWeight: 700 }}>
          <span>Grand Total</span>
          <span>{fmt(totalQty)} {unitLabel}</span>
        </div>
        <div style={{ borderLeft: rowBorder, padding: '10px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700 }}>
          {fmt(grandTotal)}
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
                taxable: Number(subTotal) || 0,
                cgst: Number(totalCGST) || 0,
                sgst: Number(totalSGST) || 0,
                igst: Number(totalIGST) || 0,
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
        Rupees {numberToWords(Math.round(grandTotal))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '44% 56%' }}>
        <div style={{ borderRight: rowBorder, padding: '10px 12px 16px', minHeight: 132 }}>
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 4 }}>
            Terms & Conditions
          </div>
          {termLines.length > 0 && (
            <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 2 }}>
              {termLines.map((line, index) => (
                <div key={`term-${index}`}>{line}</div>
              ))}
            </div>
          )}
          {notes && (
            <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: termLines.length > 0 ? 8 : 0 }}>
              Notes: {notes}
            </div>
          )}
        </div>
        <div>
          <div style={{ borderBottom: rowBorder, padding: '10px 12px 34px', fontSize: 14, fontWeight: 700 }}>
            Receiver's Signature&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:
          </div>
          <div style={{ padding: '14px 18px 10px', minHeight: 82, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>for {company?.companyName}</div>
            <div style={{ height: 42, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              {(company?.signatureUrl || company?.signature) ? (
                <img
                  src={company.signatureUrl || company.signature}
                  alt="Signature"
                  style={{ maxHeight: 42, maxWidth: 220, objectFit: 'contain' }}
                />
              ) : null}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassicBusinessDocumentPrint;
