import { NavLink } from 'react-router-dom'
import { useProgress } from '../../hooks/useProgress'
import { getTitleColor } from '../../rpg/progression'

export default function Navbar() {
  const { progress } = useProgress()
  const titleColor = getTitleColor(progress.level)

  return (
    <nav className="bg-ctp-crust border-b border-ctp-surface0 px-6 py-2 flex items-center justify-between">
      {/* Left: logo */}
      <NavLink to="/" className="text-lg font-bold text-ctp-text hover:text-ctp-blue transition-colors">
        VimDao 鍵道
      </NavLink>

      {/* Center: nav links */}
      <div className="flex items-center gap-6">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-ctp-blue' : 'text-ctp-subtext0 hover:text-ctp-text'}`
          }
        >
          道場
        </NavLink>
        <NavLink
          to="/path"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-ctp-blue' : 'text-ctp-subtext0 hover:text-ctp-text'}`
          }
        >
          修練路徑
        </NavLink>
        <NavLink
          to="/practice"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-ctp-blue' : 'text-ctp-subtext0 hover:text-ctp-text'}`
          }
        >
          自由練習
        </NavLink>
        <NavLink
          to="/commands"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-ctp-blue' : 'text-ctp-subtext0 hover:text-ctp-text'}`
          }
        >
          指令速查
        </NavLink>
        <NavLink
          to="/library"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-ctp-blue' : 'text-ctp-subtext0 hover:text-ctp-text'}`
          }
        >
          書庫
        </NavLink>
      </div>

      {/* Right: character badge */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold text-${titleColor}`}>
          Lv.{progress.level}
        </span>
        <span className={`text-sm text-${titleColor}`}>
          {progress.title}
        </span>
      </div>
    </nav>
  )
}
