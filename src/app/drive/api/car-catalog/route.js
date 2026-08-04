// src/app/drive/api/car-catalog/route.js
// Serves the car catalog (id, name, price, omv, ...) that page.js merges
// live LTA PDF prices onto.
//
// Reads from the `cars` Postgres table (see
// supabase/migrations/0001_reference_data.sql) when Supabase is
// configured, and falls back to the bundled public/data/cars.json
// snapshot otherwise — the same "never let a data source outage break the
// calculator" pattern as /drive/api/coe (COE_FALLBACK constants) and
// /drive/api/cars (cars.json fallback when the live PDF can't be parsed).
// The bundled JSON is imported statically so it's available on both edge
// and Node runtimes without a filesystem read.

import { getSupabaseReadClient } from '@/lib/shared/supabase'
import { dbRowToCar } from '@/lib/drive/carCatalog'
import bundledCars from '../../../../../public/data/cars.json'

export const runtime = 'edge'
export const revalidate = 3600

export async function GET() {
  const supabase = getSupabaseReadClient()

  if (!supabase) {
    return Response.json({
      source: 'bundled-json',
      detail: 'Supabase is not configured (SUPABASE_URL/SUPABASE_ANON_KEY missing) — serving the bundled snapshot.',
      cars: bundledCars.cars,
      checkedAt: new Date().toISOString(),
    })
  }

  const { data, error } = await supabase.from('cars').select('*')

  if (error) {
    console.error('car-catalog Supabase query failed:', error.message)
    return Response.json({
      source: 'bundled-json',
      detail: `Supabase query failed (${error.message}) — serving the bundled snapshot.`,
      cars: bundledCars.cars,
      checkedAt: new Date().toISOString(),
    })
  }

  if (!data || data.length === 0) {
    return Response.json({
      source: 'bundled-json',
      detail: 'Supabase returned zero cars — table likely not seeded yet. Serving the bundled snapshot.',
      cars: bundledCars.cars,
      checkedAt: new Date().toISOString(),
    })
  }

  return Response.json({
    source: 'supabase',
    cars: data.map(dbRowToCar),
    checkedAt: new Date().toISOString(),
  })
}
