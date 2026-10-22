import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import PageTransition from '@/components/layout/PageTransition'
import OrientationGuard from '@/components/layout/OrientationGuard'
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration'
import SoundProvider from '@/components/audio/SoundProvider'
import SoundToggle from '@/components/audio/SoundToggle'
import PreferencesProvider from '@/components/settings/PreferencesProvider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VRASS — Virtual River Awareness Simulation System',
  description: 'Adventure game simulasi ekosistem sungai. Selesaikan misi pemulihan lingkungan di 3 wilayah Jawa.',
  applicationName: 'VRASS',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VRASS',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d1f1a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("ecosim_theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <SoundProvider>
          <PreferencesProvider>
            <OrientationGuard />
            <ServiceWorkerRegistration />
            <SoundToggle />
            <PageTransition>{children}</PageTransition>
          </PreferencesProvider>
        </SoundProvider>
      </body>
    </html>
  )
}
