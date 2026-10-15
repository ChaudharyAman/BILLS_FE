import React from 'react';
import logistics from './logistics';

/**
 * Central Industry Verticals Registry
 * 
 * Provides a modular, plug-and-play architecture for industry-specific
 * features, invoice fields, and print templates.
 * 
 * To add another industry (e.g. Healthcare, Retail, Manufacturing):
 * 1. Create a folder under `src/industries/<name>/`
 * 2. Export `FormSection`, `ItemExtension`, `PrintTemplate`
 * 3. Add to the `INDUSTRIES` array below.
 */

export const INDUSTRIES = [
  {
    id: 'General',
    name: 'general',
    label: 'General / Standard (Trading, Wholesale, Services)',
    shortLabel: 'General',
    description: 'Standard GST / VAT commercial invoice layout',
  },
  logistics,
  {
    id: 'Manufacturing',
    name: 'manufacturing',
    label: 'Manufacturing & Industrial Production',
    shortLabel: 'Manufacturing',
    description: 'Raw materials, batch tracking, and production work orders',
  },
  {
    id: 'Retail',
    name: 'retail',
    label: 'Retail, Shop & eCommerce',
    shortLabel: 'Retail',
    description: 'POS, barcode scanning, and direct consumer billing',
  },
  {
    id: 'Healthcare',
    name: 'healthcare',
    label: 'Healthcare, Medical & Pharmaceuticals',
    shortLabel: 'Healthcare',
    description: 'Batch numbers, expiry dates, and drug license compliance',
  },
  {
    id: 'IT & Services',
    name: 'it_services',
    label: 'IT, Software & Digital Services',
    shortLabel: 'IT & Services',
    description: 'Time & materials, milestones, and SaaS subscriptions',
  },
  {
    id: 'Construction',
    name: 'construction',
    label: 'Construction, Contracting & Real Estate',
    shortLabel: 'Construction',
    description: 'Running bills, RA bills, and contractor retention',
  },
  {
    id: 'Consulting',
    name: 'consulting',
    label: 'Consulting & Professional Services',
    shortLabel: 'Consulting',
    description: 'Retainers and hourly advisory billing',
  },
  {
    id: 'Other',
    name: 'other',
    label: 'Other / Custom Vertical',
    shortLabel: 'Other',
    description: 'Custom industry configuration',
  },
];

/**
 * Get an industry configuration by id or name (case-insensitive)
 */
export const getIndustry = (idOrName) => {
  if (!idOrName || typeof idOrName !== 'string') return null;
  const clean = idOrName.trim().toLowerCase();
  return INDUSTRIES.find(ind =>
    ind.id?.toLowerCase() === clean ||
    ind.name?.toLowerCase() === clean ||
    ind.shortLabel?.toLowerCase() === clean
  ) || null;
};

/**
 * Check if a specific industry is active in settings or invoice data
 */
export const isIndustryActive = (industryId, settings = {}, invoice = {}) => {
  if (!industryId) return false;
  const target = industryId.toLowerCase();
  const settingsInd = (settings?.industry || '').toLowerCase();
  
  if (target === 'logistics') {
    return settingsInd === 'logistics' || Boolean(invoice?.logistics?.enabled);
  }
  return settingsInd === target;
};

/**
 * Dynamic Industry Invoice Form Section
 * Renders the specialized section if the active industry provides one.
 */
export const IndustryInvoiceSection = ({
  industryId = 'Logistics',
  formData,
  setFormData,
  isIndustryActive: active = true,
  lbl,
  inp,
}) => {
  const industry = getIndustry(industryId);
  if (!industry || !industry.FormSection) return null;

  return React.createElement(industry.FormSection, {
    formData,
    setFormData,
    isLogisticsIndustry: active,
    lbl,
    inp,
  });
};

/**
 * Dynamic Industry Line Item Extension
 * Renders per-item custom inputs (like freight currency & exemption) if provided.
 */
export const IndustryItemExtension = ({
  industryId = 'Logistics',
  item,
  index,
  formData,
  setFormData,
  updateItem,
  isIndustryActive: active = true,
}) => {
  const industry = getIndustry(industryId);
  if (!industry || !industry.ItemExtension) return null;

  return React.createElement(industry.ItemExtension, {
    item,
    index,
    formData,
    setFormData,
    updateItem,
    isActive: active,
  });
};

export {
  logistics,
};
