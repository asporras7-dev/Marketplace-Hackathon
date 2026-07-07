import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface StatItem {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  colorClass?: string // e.g. 'text-primary bg-primary/10'
}

interface DashboardStatsProps {
  stats: StatItem[]
  className?: string
}

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 my-6',
        className,
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border bg-surface p-5 transition-all duration-200 group animate-border-rainbow"
          >
            {/* Icon box */}
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                stat.colorClass ?? 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {stat.title}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink-strong">
                {stat.value}
              </p>
              {stat.description && (
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {stat.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
