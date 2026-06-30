/**
 * ptStates.js — Frontend mirror of the PT state list from the backend.
 *
 * This is a static constant; no network call needed.  Mirrors
 * MBB/utils/professionalTaxSlabs.js → PT_STATE_LIST.
 *
 * Usage:
 *   import { PT_STATE_LIST } from '../constants/ptStates';
 */

export const PT_STATE_LIST = [
  { code: '',   name: 'None / Manual Override',        leviesPT: false },
  { code: 'AN', name: 'Andaman & Nicobar Islands',     leviesPT: false },
  { code: 'AP', name: 'Andhra Pradesh',                leviesPT: true  },
  { code: 'AR', name: 'Arunachal Pradesh',             leviesPT: false },
  { code: 'AS', name: 'Assam',                         leviesPT: true  },
  { code: 'BR', name: 'Bihar',                         leviesPT: false },
  { code: 'CG', name: 'Chhattisgarh',                  leviesPT: false },
  { code: 'CH', name: 'Chandigarh',                    leviesPT: false },
  { code: 'DL', name: 'Delhi',                         leviesPT: false },
  { code: 'DN', name: 'Dadra & Nagar Haveli',          leviesPT: false },
  { code: 'DD', name: 'Daman & Diu',                   leviesPT: false },
  { code: 'GA', name: 'Goa',                           leviesPT: true  },
  { code: 'GJ', name: 'Gujarat',                       leviesPT: true  },
  { code: 'HR', name: 'Haryana',                       leviesPT: false },
  { code: 'HP', name: 'Himachal Pradesh',              leviesPT: true  },
  { code: 'JK', name: 'Jammu & Kashmir',               leviesPT: false },
  { code: 'JH', name: 'Jharkhand',                     leviesPT: true  },
  { code: 'KA', name: 'Karnataka',                     leviesPT: true  },
  { code: 'KL', name: 'Kerala',                        leviesPT: true  },
  { code: 'LA', name: 'Ladakh',                        leviesPT: false },
  { code: 'LD', name: 'Lakshadweep',                   leviesPT: false },
  { code: 'MP', name: 'Madhya Pradesh',                leviesPT: true  },
  { code: 'MH', name: 'Maharashtra',                   leviesPT: true  },
  { code: 'MN', name: 'Manipur',                       leviesPT: false },
  { code: 'ML', name: 'Meghalaya',                     leviesPT: true  },
  { code: 'MZ', name: 'Mizoram',                       leviesPT: false },
  { code: 'NL', name: 'Nagaland',                      leviesPT: false },
  { code: 'OD', name: 'Odisha',                        leviesPT: true  },
  { code: 'PB', name: 'Punjab',                        leviesPT: true  },
  { code: 'PY', name: 'Puducherry',                    leviesPT: false },
  { code: 'RJ', name: 'Rajasthan',                     leviesPT: false },
  { code: 'SK', name: 'Sikkim',                        leviesPT: true  },
  { code: 'TN', name: 'Tamil Nadu',                    leviesPT: true  },
  { code: 'TG', name: 'Telangana',                     leviesPT: true  },
  { code: 'TR', name: 'Tripura',                       leviesPT: true  },
  { code: 'UP', name: 'Uttar Pradesh',                 leviesPT: false },
  { code: 'UK', name: 'Uttarakhand',                   leviesPT: false },
  { code: 'WB', name: 'West Bengal',                   leviesPT: true  },
];
