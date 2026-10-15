# Logistics Industry Plugin (Frontend)

This folder contains all UI components, freight specifications, multi-currency line-item extensions, and print templates for the **Logistics & Freight Forwarding** vertical.

## Contents
- `LogisticsFormSection.jsx`: The comprehensive freight specifications form (Shipper details, waybills MBL/HBL, S/B, dates, exporter invoice, container number, vessel/flight, loading/discharge ports, destination, weights, CBM, delivery terms, job ref, packages).
- `LogisticsItemExtension.jsx`: Multi-currency freight and zero-tax exemption bar on invoice line items.
- `LogisticsPrintTemplate.jsx`: Complete Tribond-standard Freight Forwarding invoice layout for printing and PDF generation.
- `constants.js`: Currencies, container types, and default form data.

---

## How to Add Another Industry Vertical (e.g. Healthcare, Retail, Manufacturing)

The industry architecture is 100% modular. To add another industry:

1. Create a new folder under `src/industries/<industryName>/` (for example: `src/industries/healthcare/`).
2. Add your industry-specific components:
   - `FormSection.jsx`: Form inputs for that industry (e.g. Batch Number, Expiry Date, Drug License No., Schedule H1 tags).
   - `ItemExtension.jsx`: Any line-item specific widgets or selectors.
   - `PrintTemplate.jsx`: Custom invoice print format if needed.
   - `constants.js`: Defaults and options.
   - `index.js`: Export `id`, `label`, `description`, `FormSection`, `ItemExtension`, `PrintTemplate`.
3. Register the new industry in `src/industries/index.js`:
   ```javascript
   import healthcare from './healthcare';
   
   export const INDUSTRIES = [
     ...,
     healthcare,
   ];
   ```
4. It will immediately and automatically appear in:
   - Settings -> `Industry / Business Vertical` dropdown.
   - Invoice Form -> dynamic industry section and line items.
   - Invoice Print -> specialized print template options.
