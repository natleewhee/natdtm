import { DM_Sans, DM_Serif_Display } from 'next/font/google'

// Shared by the insure and drive verticals, which both already used this
// exact pairing (DM Sans + DM Serif Display) before the merge — loaded once
// here rather than duplicated per-layout.
export const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})
export const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400'],
})
