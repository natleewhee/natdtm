// src/lib/drive/endpoints.js
//
// The LTA route handlers live under src/app/drive/api/**, so their real URLs
// are /drive/api/*, NOT /api/*. Callers previously hardcoded '/api/coe' and
// '/api/cars' by hand, which 404'd on every request — and because a 404
// returns HTML, the `r.json()` in each caller threw and was swallowed by a
// bare .catch(), so the failure was completely silent and the calculator
// just quietly used its fallback constants forever.
//
// Both paths are defined once here so a route can never drift from its
// callers again. If these routes ever move, this is the only file to edit.

export const COE_ENDPOINT = '/drive/api/coe'
export const CARS_ENDPOINT = '/drive/api/cars'
