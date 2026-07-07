'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterX } from 'lucide-react'
import { DURATION_BUCKET_BOUNDS } from '@/lib/projects/duration'

interface ProjectFiltersProps {
  selectedStack: string
  setSelectedStack: (val: string) => void
  selectedMode: string
  setSelectedMode: (val: string) => void
  selectedDuration: string
  setSelectedDuration: (val: string) => void
  selectedBudget: string
  setSelectedBudget: (val: string) => void
  availableStacks: string[]
  onClear: () => void
}

export function ProjectFilters({
  selectedStack,
  setSelectedStack,
  selectedMode,
  setSelectedMode,
  selectedDuration,
  setSelectedDuration,
  selectedBudget,
  setSelectedBudget,
  availableStacks,
  onClear,
}: ProjectFiltersProps) {
  const tCommon = useTranslations('Common')
  const tEgresado = useTranslations('Egresado')

  const { shortMax, mediumMax } = DURATION_BUCKET_BOUNDS

  const showClearBtn =
    selectedStack || selectedMode || selectedDuration || selectedBudget

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-xl bg-card/40 backdrop-blur-sm shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider">
            {tEgresado('selectStack')}
          </label>
          <Select
            value={selectedStack || 'all'}
            onValueChange={(val) =>
              setSelectedStack(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tEgresado('selectStack')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              {availableStacks.map((stack) => (
                <SelectItem key={stack} value={stack}>
                  {stack}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider">
            {tEgresado('selectMode')}
          </label>
          <Select
            value={selectedMode || 'all'}
            onValueChange={(val) =>
              setSelectedMode(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tEgresado('selectMode')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              <SelectItem value="remoto">{tCommon('remoto')}</SelectItem>
              <SelectItem value="hibrido">{tCommon('hibrido')}</SelectItem>
              <SelectItem value="presencial">
                {tCommon('presencial')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider">
            {tEgresado('selectDuration')}
          </label>
          <Select
            value={selectedDuration || 'all'}
            onValueChange={(val) =>
              setSelectedDuration(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tEgresado('selectDuration')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              <SelectItem value="short">
                {`1 - ${shortMax} ${tCommon('days')}`}
              </SelectItem>
              <SelectItem value="medium">
                {`${shortMax + 1} - ${mediumMax} ${tCommon('days')}`}
              </SelectItem>
              <SelectItem value="long">
                {`${mediumMax + 1}+ ${tCommon('days')}`}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-primary uppercase tracking-wider">
            {tEgresado('selectBudget')}
          </label>
          <Select
            value={selectedBudget || 'all'}
            onValueChange={(val) =>
              setSelectedBudget(val === 'all' || !val ? '' : val)
            }
          >
            <SelectTrigger className="w-full h-10 bg-card border-border hover:border-primary/40 focus:ring-primary">
              <SelectValue placeholder={tEgresado('selectBudget')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('clearFilters')}</SelectItem>
              <SelectItem value="low">&lt; 500 USD</SelectItem>
              <SelectItem value="mid">500 - 800 USD</SelectItem>
              <SelectItem value="high">800+ USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showClearBtn && (
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive flex items-center gap-1.5"
          >
            <FilterX className="w-4 h-4" />
            {tCommon('clearFilters')}
          </Button>
        </div>
      )}
    </div>
  )
}
