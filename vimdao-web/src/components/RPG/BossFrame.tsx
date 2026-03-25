import type { ReactNode } from 'react'

interface BossFrameProps {
  isBoss: boolean
  children: ReactNode
}

export default function BossFrame({ isBoss, children }: BossFrameProps) {
  if (!isBoss) {
    return <>{children}</>
  }

  return (
    <div className="boss-frame">
      <div className="mb-2 flex items-center gap-1 px-2 pt-1">
        <span className="text-ctp-red font-bold text-sm">
          &#9876; BOSS 試煉
        </span>
      </div>
      {children}
    </div>
  )
}
