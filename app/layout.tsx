import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { CookieBanner } from '@/components/CookieBanner'
import { ADS_ENABLED } from '@/lib/ads-config'
import './globals.css'

// Letto una volta a livello di modulo: usato solo se ADS_ENABLED è true
// (vedi lib/ads-config.ts) e comunque assente finché l'account AdSense
// non è approvato e configurato (vedi .env.example).
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow-condensed',
})

const TITLE = 'A56 di Schrödinger — aperta o chiusa?'
const DESCRIPTION =
  'Lo stato in tempo reale della A56: aperta e chiusa finché non la osservi. Uscite aperte, in lavori o chiuse per entrambe le direzioni.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'A56 di Schrödinger',
    locale: 'it_IT',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground flex flex-col font-sans">
        {ADS_ENABLED && ADSENSE_CLIENT_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <Navbar />
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  )
}
