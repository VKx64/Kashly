import { Landmark } from 'lucide-react'

import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Landmark className="size-5" aria-hidden="true" />
      </div>
      <div className="grid leading-none">
        <span className="text-lg font-semibold tracking-normal">Kashley</span>
        <span className="text-xs font-medium text-muted-foreground">
          Private money ledger
        </span>
      </div>
    </div>
  )
}
