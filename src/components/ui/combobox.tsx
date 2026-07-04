'use client'

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/** Una opción del combobox: `value` es el código guardado, `label` el visible. */
export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  /** Texto del disparador cuando no hay selección. */
  placeholder: string
  /** Placeholder del campo de búsqueda. */
  searchPlaceholder: string
  /** Texto cuando la búsqueda no encuentra coincidencias. */
  emptyText: string
  disabled?: boolean
  id?: string
  ariaInvalid?: boolean
  className?: string | undefined
}

/**
 * Combobox con búsqueda (Popover + cmdk). El usuario busca por el nombre visible
 * y solo puede elegir de la lista: el valor seleccionado es siempre un código
 * del catálogo, nunca texto libre. Navegable por teclado (DoD §11.5).
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  id,
  ariaInvalid = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          id={id}
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            'bg-card/50 border-border w-full justify-between font-normal',
            className,
          )}
        >
          <span
            className={cn('truncate', !selected && 'text-muted-foreground')}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 size-4',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
