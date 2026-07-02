// Force Turbopack reload
import React from 'react'
import { GlobalLoader } from '@/components/ui/GlobalLoader'

export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-[9999]">
      <GlobalLoader isLoading={true} />
    </div>
  )
}
