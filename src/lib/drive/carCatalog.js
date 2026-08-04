// src/lib/drive/carCatalog.js
//
// Maps between the `cars` Postgres table (snake_case columns, see
// supabase/migrations/0001_reference_data.sql) and the app's existing car
// object shape (camelCase, historically read straight from
// public/data/cars.json). Kept in one place so the API route
// (src/app/drive/api/car-catalog/route.js) and the refresh script
// (scripts/refresh-cars.mjs) can't drift into two different ideas of what
// a "car" looks like.
//
// Deliberately does NOT map coe/loanCap — those are derived from omv via
// omvToLtv() in calc.js, not stored. dbRowToCar's output already matches
// what page.js's allCars map does to every car regardless of source
// (`{ ...car, ...omvToLtv(car.omv) }`), so leaving them out here is
// consistent with that, not a gap.

export function dbRowToCar(row) {
  const car = {
    id: row.id,
    name: row.name,
    short: row.short,
    type: row.type,
    price: row.price,
    omv: row.omv,
    rateTier: row.rate_tier,
    top5: row.top5,
    rank: row.rank ?? undefined,
    desc: row.description ?? undefined,
    ves: row.ves ?? 0,
    vesBand: row.ves_band ?? undefined,
  }
  if (row.subtotal_ex_coe != null) car.subtotalExCOE = row.subtotal_ex_coe
  return car
}

export function carToDbRow(car) {
  return {
    id: car.id,
    name: car.name,
    short: car.short,
    type: car.type,
    price: car.price,
    omv: car.omv,
    rate_tier: car.rateTier,
    top5: !!car.top5,
    rank: car.rank ?? null,
    description: car.desc ?? null,
    ves: car.ves ?? 0,
    ves_band: car.vesBand ?? null,
    subtotal_ex_coe: car.subtotalExCOE ?? null,
  }
}
