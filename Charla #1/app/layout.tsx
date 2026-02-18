import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'MedComLabs - Gestión moderna: ETL y cifrado de datos',
  description: 'Sistema de gestión hospitalaria con ETL avanzado, cifrado de datos AES-256, y optimización mediante investigación de operaciones',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/apple-icon.png',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster 
          position="top-right" 
          expand={true}
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            classNames: {
              toast: 'shadow-lg',
            }
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
