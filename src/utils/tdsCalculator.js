/**
 * Dynamically calculates TDS amount and Net Payable for an invoice.
 * Handles the edge case where TDS is not applicable.
 * 
 * @param {number} subtotal Base amount before taxes
 * @param {number} tdsRate TDS rate percentage (e.g., 10)
 * @param {number} gstTotal Total GST amount (CGST + SGST or IGST)
 * @param {boolean} tdsApplicable Whether TDS applies to this calculation
 * @returns {{tdsAmount: number, netPayable: number}} Calculated values
 */
export const calculateTDS = (subtotal, tdsRate, gstTotal = 0, tdsApplicable = true) => {
  const sub = Number(subtotal) || 0;
  const rate = Number(tdsRate) || 0;
  const gst = Number(gstTotal) || 0;

  if (!tdsApplicable) {
    return {
      tdsAmount: 0,
      netPayable: Math.round((sub + gst) * 100) / 100,
    };
  }

  const tdsAmount = Math.round(((sub * rate) / 100) * 100) / 100;
  const netPayable = Math.round((sub + gst - tdsAmount) * 100) / 100;

  return { tdsAmount, netPayable };
};
