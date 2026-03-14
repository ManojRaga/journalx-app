import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/', icon: '🪶' },
  { label: 'Editor', to: '/editor', icon: '✍️' },
  { label: 'Chat', to: '/chat', icon: '💬' },
]

export function Nav() {
  return (
    <aside className="flex w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-6 py-8">
        <span className="text-3xl">🪶</span>
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-aurum/70">Pensieve</p>
          <h1 className="font-display text-xl text-pearl">Memento Lux</h1>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-aurum/15 text-aurum shadow-glow'
                  : 'text-pearl/70 hover:bg-white/5 hover:text-pearl'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 pb-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center justify-between rounded-xl px-4 py-3 text-xs uppercase tracking-[0.25em] ${
              isActive
                ? 'bg-aurum text-midnight shadow-glow'
                : 'border border-white/10 text-pearl/60 hover:bg-white/5 hover:text-pearl'
            }`
          }
        >
          <span>Settings</span>
          <span>⚙️</span>
        </NavLink>
      </div>
    </aside>
  )
}
