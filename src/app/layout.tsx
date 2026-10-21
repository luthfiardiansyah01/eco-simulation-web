import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import PageTransition from '@/components/layout/PageTransition'
import OrientationGuard from '@/components/layout/OrientationGuard'
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Eco-Simulation Interface',
  description: 'River ecosystem simulation adventure game',
  applicationName: 'EcoSim',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EcoSim',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#3a3f5c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-[#3a3f5c] text-white antialiased">
        <OrientationGuard />
        <ServiceWorkerRegistration />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  )
}
