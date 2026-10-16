import type { Metadata } from 'next'
import './globals.css'
import PWARegister from './PWARegister'

export const metadata: Metadata = {
  metadataBase: new URL('https://asistenciaeventos.nortedesantander.gov.co'),
  title: {
    default: 'Gobernación de Norte de Santander | Sistema de Eventos',
    template: '%s | Gobernación de Norte de Santander'
  },
  description: 'Plataforma oficial de gestión de eventos, inscripciones y control de asistencia de la Gobernación de Norte de Santander.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gobernación Eventos'
  },
  openGraph: {
    title: 'Gobernación de Norte de Santander | Sistema de Eventos',
    description: 'Plataforma oficial de eventos, pre-registro de participantes y control de asistencia institucional.',
    url: 'https://asistenciaeventos.nortedesantander.gov.co',
    siteName: 'Gobernación de Norte de Santander',
    locale: 'es_CO',
    type: 'website',
    images: [
      {
        url: 'https://asistenciaeventos.nortedesantander.gov.co/logo.png',
        width: 1200,
        height: 630,
        alt: 'Gobernación de Norte de Santander'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gobernación de Norte de Santander | Sistema de Eventos',
    description: 'Plataforma oficial de eventos, pre-registro de participantes y control de asistencia institucional.',
    images: ['https://asistenciaeventos.nortedesantander.gov.co/logo.png']
  }
}

export const viewport = {
  themeColor: '#2563EB',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" style={{ colorScheme: 'light' }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
