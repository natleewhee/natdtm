// src/app/flow/the-math/route.ts
// See src/app/flow/route.ts — same 410, and its explainer content now
// lives as "The Capacity module" section of /ledger/the-math.
export async function GET() {
  return new Response(null, { status: 410 })
}
