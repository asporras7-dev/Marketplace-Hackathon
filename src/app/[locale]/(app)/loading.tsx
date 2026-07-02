// Force Turbopack reload
import React from 'react'
import { GlobalLoader } from '@/components/ui/GlobalLoader'

export default function AppLoading() {
  return <GlobalLoader isLoading={true} />
}
