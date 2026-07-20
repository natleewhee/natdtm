// src/lib/lta-parse.js
// Pure parsing helpers for the LTA Car Cost Update PDF scraper
// (src/app/api/cars/route.js). Extracted so the parsing logic can be
// unit-tested without spinning up the edge route or fetching a real PDF.

// Match terms: our car ID → substrings in lowercased LTA model name.
// Longest matching term wins (see matchToId) — order here no longer matters
// for correctness, but more specific terms are still listed first for
// readability.
export const MATCH_TERMS = {
  sealion7:    ['sealion 7 dynamic', 'sealion 7 premium', 'sealion 7'],
  byddolphin:  ['dolphin'],
  atto3:       ['atto 3 extended', 'atto 3'],
  bydatto5:    ['atto 5'],
  bydseal:     ['byd seal dynamic', 'byd seal premium', 'seal 6 premium', 'byd seal'],
  bydseagull:  ['seagull'],
  bydsealion6: ['sealion 6 dmi', 'sealion 6'],
  bydm6:       ['byd m6', 'm6 7-seater', 'denza d9'],
  bydtang:     ['byd tang'],
  bydhan:      ['byd han'],
  corolla:     ['corolla altis hybrid', 'corolla altis 1.6'],
  sienta:      ['sienta hybrid'],
  corollacross:['corolla cross hybrid'],
  yariscross:  ['yaris cross hybrid'],
  harrier:     ['harrier hybrid'],
  rav4:        ['rav4 hybrid'],
  camry:       ['camry 2.5 hev', 'camry hybrid'],
  alphard:     ['alphard hybrid'],
  vellfire:    ['vellfire hybrid'],
  priusplus:   ['prius plus'],
  fortuner:    ['fortuner'],
  landcruiser: ['land cruiser 300'],
  civic:       ['civic 1.5l turbo', 'civic e:hev'],
  freed:       ['freed 1.5 he7', 'freed'],
  vezel:       ['vezel'],
  hrv:         ['hrv 1.5 dx', 'hrv 1.5 hx', 'hr-v'],
  crv:         ['cr-v'],
  odyssey:     ['odyssey'],
  zrv:         ['step wgn'],
  accord:      ['accord'],
  mazda3:      ['mazda3 4dr', 'mazda3 5dr'],
  mazda2:      ['mazda 2 hybrid'],
  mazdacx30:   ['mazda cx-30'],
  mazdacx5:    ['mazda cx-5'],
  mazdacx8:    ['mazda cx-8'],
  mazdacx90:   ['mazda cx-90'],
  hyukona:     ['sx2 kona 1.6 gdi hev', 'kona 1.6 gdi hev', 'cn7 avante'],
  hyukonae:    ['sx2 kona ev', 'kona ev std'],
  ioniq5:      ['me ioniq 5', 'ioniq 5 2wd', 'ioniq 5'],
  ioniq5n:     ['ioniq 5 n'],
  ioniq6:      ['ioniq 6'],
  tucson:      ['tucson'],
  santa:       ['santa fe'],
  staria:      ['staria'],
  kiastonic:   ['stonic'],
  kiaseltos:   ['seltos'],
  kiaev6:      ['kia ev6'],
  kianiro:     ['niro hybrid', 'niro ev', 'niro sg2'],
  kiasorento:  ['sorento'],
  kiacarnival: ['carnival'],
  kiaev9:      ['kia ev9', 'kia ev5'],
  bmw118:      ['b.m.w. 116 mspt', 'b.m.w. 216'],
  bmw320:      ['b.m.w. 318i', 'b.m.w. 320i'],
  bmw520:      ['b.m.w. 520i', 'b.m.w. 530i'],
  bmwx1:       ['b.m.w. x1 sdrive', 'b.m.w. x1 m35', 'b.m.w. x2'],
  bmwix1:      ['b.m.w. ix1', 'b.m.w. ix2'],
  bmwx3:       ['b.m.w. x3 20'],
  bmwix3:      ['b.m.w. ix3'],
  bmwi4:       ['b.m.w. i4'],
  bmwi5:       ['b.m.w. i5'],
  bmwx5:       ['b.m.w. x5'],
  bmwix:       ['b.m.w. ix xdrive'],
  mera200:     ['mercedes benz a200', 'mercedes benz b180', 'mercedes benz cla 180'],
  merc200:     ['mercedes benz c180', 'mercedes benz c200', 'mercedes benz cle'],
  mere200:     ['mercedes benz e200'],
  merglb:      ['mercedes benz glb'],
  merglc:      ['mercedes benz glc200', 'mercedes benz glc 200'],
  mergle:      ['mercedes benz gle'],
  mereqa:      ['mercedes benz eqa'],
  mereqb:      ['mercedes benz eqb'],
  mereqe:      ['mercedes benz eqe'],
  mereqs:      ['mercedes benz eqs'],
  audia3:      ['audi a3 sedan', 'audi a3 sportback'],
  audia4:      ['audi a4', 'audi a5'],
  audiq3:      ['audi q3'],
  audiq5:      ['audi q5'],
  audiq8etron: ['audi q4', 'audi q6', 'audi q8'],
  audie6:      ['audi a6 e-tron'],
  vwgolf:      ['volkswagen golf'],
  vwtiguan:    ['volkswagen tiguan'],
  vwpassat:    ['volkswagen t-cross'],
  vwid4:       ['volkswagen id.4', 'volkswagen id.buzz'],
  vwid3:       ['volkswagen id.3'],
  vwid7:       ['volkswagen id.7'],
  volvoxc40:   ['volvo xc40 b4', 'volvo ex40'],
  volvoc40:    ['volvo c40'],
  volvoxc60:   ['volvo xc60'],
  volvoex30:   ['volvo ex30'],
  volvoex90:   ['volvo ex90', 'volvo es90'],
  polestar2:   ['polestar 2'],
  polestar3:   ['polestar 3'],
  polestar4:   ['polestar 4'],
  skodaoctavia:['skoda octavia'],
  skodaenyaq:  ['skoda enyaq'],
  skodasuperb: ['skoda superb'],
  minicooper:  ['mini jcw countryman', 'mini cooper s 2.0'],
  minielectric:['mini aceman e', 'mini cooper se electric'],
  minicountry: ['mini countryman se all4', 'mini countryman e', 'mini countryman c'],
  porschetaycan:['porsche taycan'],
  porschemc:   ['porsche macan (xa)', 'porsche macan 4'],
  porschecay:  ['porsche cayenne'],
  rangesport:  ['range rover sport'],
  defender:    ['land rover defender 110'],
  nisanserena: ['nissan serena e-power'],
  nisannote:   ['nissan note e-power'],
  nisanleaf:   ['nissan leaf'],
  nisanariya:  ['nissan ariya', 'nissan qashqai'],
  nisanxtrail: ['nissan x-trail', 'nissan kicks'],
  subarufore:  ['subaru forester'],
  subaruout:   ['subaru outback'],
  subaruxv:    ['subaru crosstrek', 'subaru solterra'],
  suzuswift:   ['suzuki swift 1.2'],
  suzubaleno:  ['suzuki baleno'],
  suzuvitara:  ['suzuki vitara', 'suzuki jimny'],
  lexusnx:     ['toyota lexus nx'],
  lexuses:     ['toyota lexus es'],
  lexusrz:     ['toyota lexus rz'],
  lexuslx:     ['toyota lexus lm', 'toyota lexus lx'],
  mgzs:        ['m.g. mgzs', 'm.g. zs ev', 'm.g. mgs6'],
  mg4:         ['m.g. mg4'],
  mghsev:      ['m.g. mgs5', 'm.g. im5', 'm.g. im6'],
  xpengG6:     ['xpeng g6'],
  xpengG9:     ['xpeng g9', 'xpeng x9'],
  xpengP7:     ['xpeng p7'],
  zeekrx:      ['zeekr x rwd'],
  zeekr001:    ['zeekr 001'],
  zeekr7x:     ['zeekr 7x'],
  gacaionv:    ['gac aion v'],
  gacaiony:    ['gac aion y'],
  gachyper:    ['gac aion hyptec', 'gac e9'],
  omoda5:      ['chery omoda'],
  deepalS7:    ['deepal s07', 'deepal s7'],
  smart1:      ['smart #1'],
  smart3:      ['smart #3'],
  jaecoo7:     ['chery jaecoo7', 'chery jaecoo6'],
  mitout:      ['mitsubishi outlander'],
  mitasx:      ['mitsubishi asx'],
  miteclipse:  ['mitsubishi eclipse'],
}

// Anchor: M032 = Feb 2026. Increments +1 each month.
// Takes an optional Date (defaults to now) so it can be unit tested without
// mocking global time.
export function getPdfNumbers(now = new Date()) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const monthsSince = (y - 2026) * 12 + (m - 2)
  const n = 32 + monthsSince
  return [`M${String(n).padStart(3,'0')}`, `M${String(n-1).padStart(3,'0')}`]
}

// Extract text content from a PDF binary buffer using parenthesised string extraction
export function extractPdfText(buffer) {
  const bytes = new Uint8Array(buffer)
  let raw = ''
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]
    if (c >= 32 && c < 127) raw += String.fromCharCode(c)
    else if (c === 10 || c === 13) raw += '\n'
    else raw += ' '
  }

  // Extract text from BT...ET text objects (standard PDF text blocks)
  let out = ''
  const btEt = /BT([\s\S]*?)ET/g
  let m
  while ((m = btEt.exec(raw)) !== null) {
    const block = m[1]
    // Extract (string) tokens
    const strPat = /\(([^)]*)\)/g
    let sm
    while ((sm = strPat.exec(block)) !== null) {
      out += sm[1] + ' '
    }
    out += '\n'
  }

  // Fallback: extract all parenthesised strings if BT/ET gave little
  if (out.length < 500) {
    const allStr = /\(([^)]{2,60})\)/g
    let am
    while ((am = allStr.exec(raw)) !== null) {
      out += am[1] + ' '
    }
  }

  return out
}

// Parse the extracted PDF text into rows with name + selling price.
// The LTA table rows in the PDF text look like:
// "41 BYD ATTO 3 EXTENDED RANGE A 100 E 64 A 28519 8784 31927 -22500 -7500 350 106320 39580 145900 - 246388 - 100488"
// We split line by line, look for lines starting with a row number, then
// extract the name tokens and the numeric columns.
export function parseLTARows(text) {
  const results = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 20) continue

    // Check if line starts with a row number
    const startMatch = trimmed.match(/^(\d{1,3})\s+(.+)/)
    if (!startMatch) continue

    const rowNum = parseInt(startMatch[1])
    if (rowNum < 1 || rowNum > 300) continue

    const content = startMatch[2]

    // Skip header/note lines that match row numbers coincidentally
    if (content.match(/^(Cost|Difference|VES|Regn|COE|Total|Selling|Make|SN\s)/i)) continue

    // Extract numbers from the content
    // LTA prices are formatted without commas in the extracted text
    const numTokens = content.match(/-?\d{3,7}/g)
    if (!numTokens || numTokens.length < 6) continue

    const nums = numTokens.map(n => parseInt(n)).filter(n => !isNaN(n))

    // Find the selling price (with COE):
    // - It's in the 100,000 - 900,000 range
    // - Appears after total_basic_with_COE (also large)
    // - Is the larger of the two consecutive large numbers near the end
    const largNums = nums.filter(n => n >= 100000 && n <= 900000)
    if (largNums.length < 1) continue

    // The selling price is typically the LAST large number (or second to last)
    // because the final column is "difference" which is smaller.
    // Look for two consecutive large numbers: [total_basic, selling_price]
    let sellingPrice = null
    let totalBasic = null
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i] >= 100000 && nums[i] <= 700000 &&
          nums[i+1] >= 100000 && nums[i+1] <= 900000 &&
          nums[i+1] > nums[i]) {
        totalBasic = nums[i]
        sellingPrice = nums[i+1]
      }
    }

    // Fallback: largest number in row that's > 120000
    if (!sellingPrice) {
      const candidates = nums.filter(n => n >= 120000 && n <= 900000)
      if (candidates.length > 0) sellingPrice = Math.max(...candidates)
    }

    if (!sellingPrice || sellingPrice < 80000) continue

    // Extract car name — everything before the first letter-only token that
    // looks like a COE category (A or B) followed by a number
    const tokens = content.split(/\s+/)
    let nameTokens = []
    let foundCOECat = false
    for (let i = 0; i < tokens.length; i++) {
      if ((tokens[i] === 'A' || tokens[i] === 'B') && !foundCOECat) {
        const next = tokens[i+1]
        if (next && /^\d/.test(next)) {
          foundCOECat = true
          break
        }
      }
      // Break on a numeric spec column (engine cc, displacement code, etc — always
      // 2+ digits in this table), but NOT on a single digit, since single digits
      // are frequently part of the model name itself (e.g. "ATTO 3", "IONIQ 5",
      // "SEALION 7", "MAZDA 2"). Without this distinction the name gets
      // truncated before the trim number, and matchToId() — whose terms often
      // include that digit — fails to match the car at all.
      if (/^\d{2,}/.test(tokens[i]) && nameTokens.length > 0) break
      if (/^[A-Z]/.test(tokens[i]) || tokens[i].match(/^[A-Z0-9\.\-\#\:\/\(\)]+$/)) {
        nameTokens.push(tokens[i])
      }
    }

    const name = nameTokens.join(' ').toLowerCase().trim()
    if (name.length < 3) continue

    // Extract OMV (first number in 5000-200000 range)
    let omv = null
    for (const n of nums) {
      if (n >= 5000 && n <= 200000 && n !== sellingPrice && n !== totalBasic) {
        omv = n
        break
      }
    }

    // Extract VES rebate (negative number, store as positive)
    let vesAmount = 0
    for (const n of nums) {
      if (n < 0 && n >= -30000) {
        vesAmount = Math.abs(n)
        break
      }
    }

    results.push({ name, sellingPrice, omv, vesAmount, rowNum })
  }

  return results
}

// Match an LTA model name to our internal car ID. Picks the LONGEST matching
// term across all ids (not the first id that happens to have a substring
// match) so that e.g. "ioniq 5 n" resolves to ioniq5n rather than ioniq5,
// regardless of key ordering in MATCH_TERMS.
export function matchToId(ltaName, matchTerms = MATCH_TERMS) {
  const lower = ltaName.toLowerCase()
  let bestId = null
  let bestLen = 0
  for (const [id, terms] of Object.entries(matchTerms)) {
    for (const term of terms) {
      if (lower.includes(term) && term.length > bestLen) {
        bestId = id
        bestLen = term.length
      }
    }
  }
  return bestId
}

// If a parse matches fewer than this many cars, the LTA PDF layout has
// likely drifted from what MATCH_TERMS expects (or the fetch returned a
// near-empty/garbled document) — the caller should flag this rather than
// silently serving a mostly-empty price map as a normal update.
export const MIN_COVERAGE = 30

export function isLowCoverage(matchedCars) {
  return matchedCars < MIN_COVERAGE
}
