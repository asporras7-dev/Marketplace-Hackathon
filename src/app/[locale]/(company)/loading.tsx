import { GlobalLoader } from '@/components/ui/GlobalLoader'

export default function CompanyLoading() {
  return (
    <div className="fixed inset-0 z-[9999]">
      <GlobalLoader isLoading={true} />
    </div>
  )
}
