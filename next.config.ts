import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
  experimental: {
    // Los entregables se suben por una server action (FormData). El bucket
    // admite 50MB; damos algo de aire por el overhead de multipart para que un
    // archivo cercano al límite no lo rechace Next antes de llegar a Storage.
    serverActions: {
      bodySizeLimit: '55mb',
    },
  },
  // Permite acceder al dev server desde la IP de red local (ademas de localhost)
  // sin el aviso de cross-origin de Next.js.
  allowedDevOrigins: ['192.168.0.7'],
  // Compatibilidad: la ruta /junior se renombró a /egresado. Este redirect
  // mantiene vivos enlaces y bookmarks viejos (incluye el prefijo de locale).
  async redirects() {
    return [
      {
        source: '/:locale(es|en)/junior/:path*',
        destination: '/:locale/egresado/:path*',
        permanent: true,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
