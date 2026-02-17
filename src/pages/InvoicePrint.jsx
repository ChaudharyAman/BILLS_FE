import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { Printer } from 'lucide-react';

const InvoicePrint = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/invoices/${id}`);
        setInvoice(response.data);
      } catch (error) {
        console.error('Error fetching invoice:', error);
      }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    fetchInvoice();
    fetchSettings();
  }, [id]);

  if (!invoice) return <div className="p-10">Loading invoice...</div>;

  return (
    <div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white">
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none print:mx-0">
        
        {/* Top Header Color Stripe */}
        <div className="h-4 bg-blue-600 print:bg-blue-600"></div>

        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-4xl font-extrabold text-blue-800 tracking-tight">INVOICE</h1>
                <p className="text-gray-500 mt-1 font-medium">#{invoice.invoiceNo}</p>
                {invoice.status && invoice.status !== 'DRAFT' && (
                     <div className={`mt-4 inline-block px-4 py-1 border-2 rounded transform -rotate-6 font-bold text-lg uppercase opacity-80
                        ${invoice.status === 'PAID' ? 'text-green-600 border-green-600' : 
                          invoice.status === 'UNPAID' ? 'text-red-600 border-red-600' : 
                          invoice.status === 'PARTIAL' ? 'text-orange-500 border-orange-500' : 
                          'text-blue-600 border-blue-600'}`}
                     >
                        {invoice.status}
                     </div>
                )}
                {invoice.transport?.poNumber && (
                    <p className="text-sm text-gray-600 mt-2">
                        <span className="font-semibold">PO No:</span> {invoice.transport.poNumber}
                    </p>
                )}
            </div>
            <div className="text-right">
                {settings?.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="h-16 mb-2 ml-auto object-contain" />
                )}
                <h2 className="font-bold text-xl text-gray-900">{settings?.companyName || 'MyBill Company'}</h2>
                <p className="text-gray-600 text-sm whitespace-pre-line">{settings?.address?.line1}</p>
                <p className="text-gray-600 text-sm">
                    {settings?.address?.city} {settings?.address?.state && `, ${settings.address.state}`} {settings?.address?.zip}
                </p>
                {settings?.gstin && <p className="text-gray-600 text-sm font-semibold">GSTIN: {settings.gstin}</p>}
                {settings?.email && <p className="text-gray-600 text-sm">{settings.email}</p>}
                {settings?.phone && <p className="text-gray-600 text-sm">{settings.phone}</p>}
            </div>
            </div>

            {/* Bill To / Ship To / Invoice Details */}
            <div className="grid grid-cols-3 gap-8 mb-8 border-t border-b border-gray-100 py-6">
                
                {/* Bill To */}
                <div>
                    <h3 className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">Bill To</h3>
                    <p className="font-bold text-gray-900">{invoice.client?.name}</p>
                    <p className="text-gray-600 text-sm whitespace-pre-line">{invoice.client?.address?.line1}</p>
                    <p className="text-gray-600 text-sm">
                    {invoice.client?.address?.city}, {invoice.client?.address?.state} {invoice.client?.address?.zip}
                    </p>
                    {invoice.client?.gstin && (
                        <p className="text-gray-800 text-sm mt-1 font-medium">GSTIN: {invoice.client.gstin}</p>
                    )}
                </div>

                {/* Ship To (Show only if exists and different) */}
                <div>
                     {invoice.shippingAddress?.line1 && (
                        <>
                            <h3 className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">Ship To</h3>
                            <p className="font-bold text-gray-900">{invoice.client?.name}</p>
                            <p className="text-gray-600 text-sm whitespace-pre-line">{invoice.shippingAddress.line1}</p>
                            <p className="text-gray-600 text-sm">
                            {invoice.shippingAddress.city}, {invoice.shippingAddress.state} {invoice.shippingAddress.zip}
                            </p>
                        </>
                    )}
                </div>

                {/* Details */}
                <div className="text-right space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Invoice Date:</span>
                        <span className="font-medium text-gray-900">{new Date(invoice.date).toLocaleDateString()}</span>
                    </div>
                    {invoice.dueDate && (
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Due Date:</span>
                        <span className="font-medium text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Place of Supply:</span>
                        <span className="font-medium text-gray-900">{invoice.placeOfSupply || 'N/A'}</span>
                    </div>
                     {invoice.transport?.vehicleNumber && (
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Vehicle No:</span>
                            <span className="font-medium text-gray-900">{invoice.transport.vehicleNumber}</span>
                        </div>
                    )}
                     <div className="flex justify-between">
                        <span className="text-gray-500 text-sm">Payment Mode:</span>
                        <span className="font-medium text-gray-900">{invoice.paymentMode || '-'}</span>
                    </div>
                     {invoice.paymentTerms && (
                        <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">Terms:</span>
                            <span className="font-medium text-gray-900">{invoice.paymentTerms}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8 border-collapse">
            <thead>
                <tr className="bg-blue-600 text-white">
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider rounded-tl-lg">Item</th>
                <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider">HSN</th>
                <th className="text-center p-3 text-xs font-semibold uppercase tracking-wider">Qty</th>
                <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider">Rate</th>
                {/* Conditional Columns for GST could go here if we want detailed columns, but usually Amount is taxable value */}
                <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider">Tax amount</th> 
                <th className="text-right p-3 text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Amount</th>
                </tr>
            </thead>
            <tbody>
                {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{item.hsnCode}</td>
                    <td className="p-3 text-center text-sm">{item.qty} {item.unit}</td>
                    <td className="p-3 text-right text-sm">₹{item.rate.toFixed(2)}</td>
                    <td className="p-3 text-right text-sm">
                        ₹{item.taxAmount.toFixed(2)}
                        <div className="text-[10px] text-gray-400">({item.taxRate}%)</div>
                    </td>
                    <td className="p-3 text-right font-medium text-gray-900">₹{item.amount.toFixed(2)}</td>
                </tr>
                ))}
            </tbody>
            </table>

            {/* Footer Section: Bank Details + Totals */}
            <div className="flex flex-col md:flex-row justify-between gap-8">
                
                {/* Left Side: Bank Details & Terms */}
                {/* Left Side: Bank Details Removed as per request */}
                <div className="flex-1">
                </div>

                {/* Right Side: Totals */}
                <div className="w-80">
                    <div className="space-y-2">
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>Subtotal (Taxable):</span>
                            <span>₹{invoice.subTotal.toFixed(2)}</span>
                        </div>
                        
                        {/* Tax Breakdown */}
                        {invoice.totalIGST > 0 ? (
                             <div className="flex justify-between text-gray-600 text-sm">
                                <span>IGST:</span>
                                <span>₹{invoice.totalIGST.toFixed(2)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>CGST:</span>
                                    <span>₹{invoice.totalCGST.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-sm">
                                    <span>SGST:</span>
                                    <span>₹{invoice.totalSGST.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        
                        {invoice.shippingCharges > 0 && (
                             <div className="flex justify-between text-gray-600 text-sm">
                                <span>Shipping:</span>
                                <span>₹{invoice.shippingCharges.toFixed(2)}</span>
                            </div>
                        )}
                        
                        {invoice.packagingCharges > 0 && (
                             <div className="flex justify-between text-gray-600 text-sm">
                                <span>{invoice.customChargeLabel || 'Extra Charges'}:</span>
                                <span>₹{invoice.packagingCharges.toFixed(2)}</span>
                            </div>
                        )}

                        {invoice.discountTotal > 0 && (
                             <div className="flex justify-between text-red-500 text-sm">
                                <span>Discount:</span>
                                <span>- ₹{invoice.discountTotal.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-2xl font-bold bg-blue-600 text-white p-3 rounded-lg mt-3">
                            <span>Total:</span>
                            <span>₹{invoice.grandTotal.toFixed(2)}</span>
                        </div>

                         {invoice.advancePaid > 0 && (
                             <>
                                <div className="flex justify-between text-green-600 text-sm font-medium pt-2">
                                    <span>Advance Paid:</span>
                                    <span>- ₹{invoice.advancePaid.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-800 text-md font-bold border-t border-gray-200 pt-1">
                                    <span>Balance Due:</span>
                                    <span>₹{invoice.balanceDue.toFixed(2)}</span>
                                </div>
                             </>
                        )}
                    </div>
                     <div className="mt-8 text-right">
                        <p className="text-sm font-bold text-gray-900">For {settings?.companyName || 'MyBill Company'}</p>
                        <div className="h-16"></div> {/* Space for signature */}
                        <p className="text-xs text-gray-500 uppercase">Authorized Signatory</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 print:hidden text-center flex justify-center gap-4">
                 <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2" 
                  onClick={() => window.print()}
                 >
                    <div className="w-5 h-5"><Printer size={20}/></div>
                    Print / Save as PDF
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;
