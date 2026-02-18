import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-slate-200 placeholder:text-slate-400 focus-visible:border-teal-500 focus-visible:ring-teal-500/50 aria-invalid:ring-red-500/20 aria-invalid:border-red-500 flex field-sizing-content min-h-16 w-full rounded-md border bg-white px-3 py-2 text-base text-slate-900 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
