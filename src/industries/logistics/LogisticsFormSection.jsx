import React from 'react';
import { FaShip, FaBoxes, FaFileInvoice, FaPlane, FaTruck } from 'react-icons/fa';

/**
 * LogisticsFormSection
 * 
 * Specialized Invoice Form section for Logistics & Freight Forwarding vertical.
 * Captures shipper/consignor, waybills (MBL/HBL), vessel/flight, container specs,
 * ports of loading/discharge, and cargo specifications.
 */
const LogisticsFormSection = ({
  formData,
  setFormData,
  isLogisticsIndustry,
  lbl = 'block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1',
  inp = 'w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors',
}) => {
  if (!isLogisticsIndustry) return null;

  const logistics = formData.logistics || {};

  const updateLogisticsField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      logistics: {
        ...(prev.logistics || {}),
        [field]: value,
      },
    }));
  };

  const toggleSection = () => {
    setFormData(prev => ({
      ...prev,
      logistics: {
        ...(prev.logistics || {}),
        enabled: !prev.logistics?.enabled,
      },
    }));
  };

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-sky-50/60 dark:from-slate-900/90 dark:via-blue-950/40 dark:to-slate-900/80 border border-blue-200/80 dark:border-blue-900/60 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-blue-100 dark:border-blue-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <FaShip size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
              Logistics & Freight Forwarding Specifications
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Standard Cargo Format
              </span>
            </h3>
            <p className="text-xs text-blue-600/80 dark:text-blue-400">
              Captures MBL/HBL waybills, vessel/flight info, container specs, ports, and multi-currency billing
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSection}
          className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
        >
          {logistics.enabled ? 'Hide Section' : 'Show Section'}
        </button>
      </div>

      {logistics.enabled && (
        <div className="space-y-4">
          {/* Panel 1: Shipper / Consignor */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-100 dark:border-slate-800 rounded-lg p-3.5">
            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FaBoxes className="text-blue-600 dark:text-blue-400" />
              <span>Shipper / Consignor Details</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Shipper Name</label>
                <input
                  className={inp}
                  placeholder="e.g. SHENZHEN TOP SENSE LOGISTICS CO., LTD"
                  value={logistics.shipperName || ''}
                  onChange={(e) => updateLogisticsField('shipperName', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Shipper Address</label>
                <input
                  className={inp}
                  placeholder="e.g. ROOM 203, BUILDING 1, LIANTANG IND. ZONE"
                  value={logistics.shipperAddress || ''}
                  onChange={(e) => updateLogisticsField('shipperAddress', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Shipper Country</label>
                <input
                  className={inp}
                  placeholder="e.g. CHINA"
                  value={logistics.shipperCountry || ''}
                  onChange={(e) => updateLogisticsField('shipperCountry', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Panel 2: Waybills & Document Reference Numbers */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-100 dark:border-slate-800 rounded-lg p-3.5">
            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FaFileInvoice className="text-blue-600 dark:text-blue-400" />
              <span>Waybills & Shipping References</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lbl}>MBL / MAWB No.</label>
                <input
                  className={inp}
                  placeholder="e.g. 176-92147101 / 312-93326693"
                  value={logistics.mblNo || ''}
                  onChange={(e) => updateLogisticsField('mblNo', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>MBL Date</label>
                <input
                  type="date"
                  className={inp}
                  value={logistics.mblDate ? logistics.mblDate.split('T')[0] : ''}
                  onChange={(e) => updateLogisticsField('mblDate', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>HBL / HAWB No.</label>
                <input
                  className={inp}
                  placeholder="e.g. W25100067 / HFAE26090055"
                  value={logistics.hblNo || ''}
                  onChange={(e) => updateLogisticsField('hblNo', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>HBL Date</label>
                <input
                  type="date"
                  className={inp}
                  value={logistics.hblDate ? logistics.hblDate.split('T')[0] : ''}
                  onChange={(e) => updateLogisticsField('hblDate', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Job Reference No.</label>
                <input
                  className={inp}
                  placeholder="e.g. DEL/AIR/IMP/24-25/0819"
                  value={logistics.jobRef || ''}
                  onChange={(e) => updateLogisticsField('jobRef', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>S/B or BoE No. / BL No</label>
                <input
                  className={inp}
                  placeholder="e.g. 8724128"
                  value={logistics.sbNo || ''}
                  onChange={(e) => updateLogisticsField('sbNo', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>S/B Date</label>
                <input
                  type="date"
                  className={inp}
                  value={logistics.sbDate ? logistics.sbDate.split('T')[0] : ''}
                  onChange={(e) => updateLogisticsField('sbDate', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Exporter Inv No.</label>
                <input
                  className={inp}
                  placeholder="e.g. EXP-99120"
                  value={logistics.exporterInvNo || ''}
                  onChange={(e) => updateLogisticsField('exporterInvNo', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Exporter Inv Date</label>
                <input
                  type="date"
                  className={inp}
                  value={logistics.exporterInvDate ? logistics.exporterInvDate.split('T')[0] : ''}
                  onChange={(e) => updateLogisticsField('exporterInvDate', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Delivery Note</label>
                <input
                  className={inp}
                  placeholder="e.g. DN-2026-0076"
                  value={logistics.deliveryNote || ''}
                  onChange={(e) => updateLogisticsField('deliveryNote', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Other Reference(s)</label>
                <input
                  className={inp}
                  placeholder="e.g. LC Ref / Contract Ref"
                  value={logistics.otherReferences || ''}
                  onChange={(e) => updateLogisticsField('otherReferences', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Shipping Line / Carrier</label>
                <input
                  className={inp}
                  placeholder="e.g. Qatar Airways / Maersk"
                  value={logistics.shippingLine || ''}
                  onChange={(e) => updateLogisticsField('shippingLine', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Panel 3: Vessel / Vehicle & Routing */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-100 dark:border-slate-800 rounded-lg p-3.5">
            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FaPlane className="text-blue-600 dark:text-blue-400" />
              <span>Vessel / Flight / Vehicle & Ports</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lbl}>Vessel / Flight Name</label>
                <input
                  className={inp}
                  placeholder="e.g. QR8932"
                  value={logistics.vesselName || ''}
                  onChange={(e) => updateLogisticsField('vesselName', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Flight / Voyage No.</label>
                <input
                  className={inp}
                  placeholder="e.g. V.204"
                  value={logistics.flightNo || ''}
                  onChange={(e) => updateLogisticsField('flightNo', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Vehicle / Truck No.</label>
                <input
                  className={inp}
                  placeholder="e.g. HR-55-AB-1234"
                  value={logistics.vehicleNo || ''}
                  onChange={(e) => updateLogisticsField('vehicleNo', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Despatched Through</label>
                <input
                  className={inp}
                  placeholder="e.g. Air Import / Sea Import"
                  value={logistics.despatchedThrough || ''}
                  onChange={(e) => updateLogisticsField('despatchedThrough', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Terms of Delivery</label>
                <input
                  className={inp}
                  placeholder="e.g. As per Contract / CIF / FOB"
                  value={logistics.termsOfDelivery || ''}
                  onChange={(e) => updateLogisticsField('termsOfDelivery', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Port of Loading (POL)</label>
                <input
                  className={inp}
                  placeholder="e.g. SHENZHEN / SZX"
                  value={logistics.portOfLoading || ''}
                  onChange={(e) => updateLogisticsField('portOfLoading', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Port of Discharge (POD)</label>
                <input
                  className={inp}
                  placeholder="e.g. DELHI AIR CARGO / DEL"
                  value={logistics.portOfDischarge || ''}
                  onChange={(e) => updateLogisticsField('portOfDischarge', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Final Destination / Delivery</label>
                <input
                  className={inp}
                  placeholder="e.g. NEW DELHI, INDIA"
                  value={logistics.finalDestination || ''}
                  onChange={(e) => updateLogisticsField('finalDestination', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Panel 4: Cargo & Packaging Specifications */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-100 dark:border-slate-800 rounded-lg p-3.5">
            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FaTruck className="text-blue-600 dark:text-blue-400" />
              <span>Cargo & Packaging Specifications</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lbl}>Packages & Type</label>
                <input
                  className={inp}
                  placeholder="e.g. 52 PKGS / 10 CARTONS"
                  value={logistics.packages || ''}
                  onChange={(e) => updateLogisticsField('packages', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Gross Weight (Kg/MT)</label>
                <input
                  className={inp}
                  placeholder="e.g. 1848 KGS"
                  value={logistics.grossWeight || ''}
                  onChange={(e) => updateLogisticsField('grossWeight', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Chargable Weight (Kg/MT)</label>
                <input
                  className={inp}
                  placeholder="e.g. 1848 KGS"
                  value={logistics.chargeableWeight || ''}
                  onChange={(e) => updateLogisticsField('chargeableWeight', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Net Weight (Kg/MT)</label>
                <input
                  className={inp}
                  placeholder="e.g. 1750 KGS"
                  value={logistics.netWeight || ''}
                  onChange={(e) => updateLogisticsField('netWeight', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Volume / CBM</label>
                <input
                  className={inp}
                  placeholder="e.g. 1.25 CBM / 208.3 KG"
                  value={logistics.cbm || ''}
                  onChange={(e) => updateLogisticsField('cbm', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Cargo Description</label>
                <input
                  className={inp}
                  placeholder="e.g. Loose / General Cargo"
                  value={logistics.cargoDescription || ''}
                  onChange={(e) => updateLogisticsField('cargoDescription', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className={lbl}>Container / Seal No.</label>
                <input
                  className={inp}
                  placeholder="e.g. MSKU1234567 / SL-889"
                  value={logistics.containerNo || ''}
                  onChange={(e) => updateLogisticsField('containerNo', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsFormSection;
