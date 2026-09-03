// src/lib/maintenance.js
// Annual maintenance cost estimates by brand, shared between the
// renew-or-replace tool and the total-cost-of-ownership estimate on the
// main calculator (src/lib/tco.js).

// Annual servicing (S$) based on Singapore workshop data 2026.
// Age-related repair costs on top, following a non-linear curve.
export const MAINTENANCE_BY_BRAND = {
  toyota:     { label: 'Toyota',         annualService: 620,  tier: 'japanese'  },
  honda:      { label: 'Honda',          annualService: 740,  tier: 'japanese'  },
  nissan:     { label: 'Nissan',         annualService: 680,  tier: 'japanese'  },
  mazda:      { label: 'Mazda',          annualService: 850,  tier: 'japanese'  },
  suzuki:     { label: 'Suzuki',         annualService: 580,  tier: 'japanese'  },
  subaru:     { label: 'Subaru',         annualService: 900,  tier: 'japanese'  },
  mitsubishi: { label: 'Mitsubishi',     annualService: 750,  tier: 'japanese'  },
  lexus:      { label: 'Lexus',          annualService: 1200, tier: 'japanese'  },
  hyundai:    { label: 'Hyundai',        annualService: 820,  tier: 'korean'    },
  kia:        { label: 'Kia',            annualService: 800,  tier: 'korean'    },
  byd:        { label: 'BYD',            annualService: 380,  tier: 'chinese_ev'},
  mg:         { label: 'MG',             annualService: 420,  tier: 'chinese_ev'},
  xpeng:      { label: 'Xpeng',          annualService: 400,  tier: 'chinese_ev'},
  zeekr:      { label: 'Zeekr',          annualService: 400,  tier: 'chinese_ev'},
  gac:        { label: 'GAC Aion',       annualService: 380,  tier: 'chinese_ev'},
  deepal:     { label: 'Deepal',         annualService: 380,  tier: 'chinese_ev'},
  smart:      { label: 'smart',          annualService: 500,  tier: 'chinese_ev'},
  chery:      { label: 'Chery',          annualService: 420,  tier: 'chinese_ev'},
  omoda:      { label: 'Omoda',          annualService: 420,  tier: 'chinese_ev'},
  jaecoo:     { label: 'Jaecoo',         annualService: 420,  tier: 'chinese_ev'},
  volkswagen: { label: 'Volkswagen',     annualService: 1100, tier: 'european'  },
  skoda:      { label: 'Skoda',          annualService: 950,  tier: 'european'  },
  volvo:      { label: 'Volvo',          annualService: 1400, tier: 'european'  },
  polestar:   { label: 'Polestar',       annualService: 900,  tier: 'european'  },
  mini:       { label: 'MINI',           annualService: 1300, tier: 'european'  },
  bmw:        { label: 'BMW',            annualService: 2200, tier: 'german'    },
  mercedes:   { label: 'Mercedes-Benz',  annualService: 2400, tier: 'german'    },
  audi:       { label: 'Audi',           annualService: 2100, tier: 'german'    },
  porsche:    { label: 'Porsche',        annualService: 3500, tier: 'german'    },
  landrover:  { label: 'Land Rover',     annualService: 3200, tier: 'german'    },
  tesla:      { label: 'Tesla',          annualService: 500,  tier: 'tesla'     },
}

// Age-related repair costs per tier (S$/year, indexed 0=yr1 to 9=yr10)
const AGE_REPAIR = {
  japanese:   [0, 0, 0, 400,  800,  800, 1500, 2500, 3500, 5000],
  korean:     [0, 0, 0, 500,  900,  900, 1800, 2800, 4000, 5500],
  chinese_ev: [0, 0, 0, 200,  400,  400,  800, 1500, 3000, 6000],
  european:   [0, 0, 0, 600, 1000, 1000, 2000, 3500, 5000, 7000],
  german:     [0, 0, 0, 800, 1500, 1500, 3000, 5000, 7500,10000],
  tesla:      [0, 0, 0, 300,  600,  600, 1200, 2000, 4000, 8000],
}

/**
 * Annual maintenance estimate for a brand at a given age: base annual
 * service cost plus a non-linear, tier-based age-related repair cost.
 * Falls back to the 'toyota' brand/tier if the key is unknown.
 * @param {string} brandKey - Key into MAINTENANCE_BY_BRAND.
 * @param {number} ageYears - Vehicle age in years.
 * @returns {number} Estimated annual maintenance cost in dollars.
 */
export function getAnnualMaintenance(brandKey, ageYears) {
  const brand = MAINTENANCE_BY_BRAND[brandKey] || MAINTENANCE_BY_BRAND.toyota
  const repairs = AGE_REPAIR[brand.tier] || AGE_REPAIR.japanese
  const idx = Math.min(Math.max(0, Math.floor(ageYears) - 1), 9)
  return brand.annualService + (repairs[idx] || 0)
}

/**
 * Total maintenance cost over a span of ownership years, summing the
 * annual estimate for each year of age.
 * @param {string} brandKey - Key into MAINTENANCE_BY_BRAND.
 * @param {number} startAge - Vehicle age in years at the start of the span.
 * @param {number} years - Number of years to sum over.
 * @returns {number} Total maintenance cost in dollars.
 */
export function getTotalMaintenance(brandKey, startAge, years) {
  let total = 0
  for (let y = 0; y < years; y++) total += getAnnualMaintenance(brandKey, startAge + y)
  return total
}
