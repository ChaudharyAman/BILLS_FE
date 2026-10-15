import LogisticsFormSection from './LogisticsFormSection';
import LogisticsItemExtension from './LogisticsItemExtension';
import LogisticsPrintTemplate from './LogisticsPrintTemplate';
import LogisticsModeToggle from './LogisticsModeToggle';
import { DEFAULT_LOGISTICS_DATA, LOGISTICS_CURRENCIES, mapInvoiceToLogistics } from './constants';

/**
 * Logistics Industry Plugin Export
 */
const logisticsPlugin = {
  id: 'Logistics',
  name: 'logistics',
  label: 'Logistics, Cargo & Freight Forwarding (Air, Sea, Road, Multimodal)',
  shortLabel: 'Logistics',
  badge: '🚚 Logistics & Freight Mode Active',
  description: 'Logistics & Freight Forwarding Specifications (MBL/HBL waybills, vessel/flight info, container specs, ports, multi-currency billing)',
  defaultFormData: DEFAULT_LOGISTICS_DATA,
  currencies: LOGISTICS_CURRENCIES,
  mapInvoice: mapInvoiceToLogistics,
  ModeToggle: LogisticsModeToggle,
  FormSection: LogisticsFormSection,
  ItemExtension: LogisticsItemExtension,
  PrintTemplate: LogisticsPrintTemplate,
};

export default logisticsPlugin;
export {
  LogisticsFormSection,
  LogisticsItemExtension,
  LogisticsPrintTemplate,
  LogisticsModeToggle,
  DEFAULT_LOGISTICS_DATA,
  LOGISTICS_CURRENCIES,
  mapInvoiceToLogistics,
};
