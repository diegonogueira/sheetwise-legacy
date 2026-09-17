import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

interface SegmentedProps<T extends string> {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
  /** cinza e sem clique: a escolha fica à vista, mas não vale no modo atual */
  disabled?: boolean
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  disabled = false,
}: SegmentedProps<T>) {
  return (
    <div className={cx('inline-flex rounded-xl bg-line p-0.5', disabled && 'opacity-50', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg transition-colors disabled:cursor-not-allowed',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value
              ? 'bg-surface font-medium text-ink shadow-sm'
              : cx('text-muted', !disabled && 'hover:text-ink'),
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
