import { useState } from 'react'
import { Activity, FlaskConical, Wrench, CalendarCheck, AlertCircle, Search } from 'lucide-react'
import useStore from './hooks/useStore'
import useScraperStore from './hooks/useScraperStore'
import { isSupabaseConfigured } from './lib/supabase'
import TrackingTab from './components/tabs/TrackingTab'
import ResearchTab from './components/tabs/ResearchTab'
import WorkingTab from './components/tabs/WorkingTab'
import DailyTab from './components/tabs/DailyTab'
import ScraperTab from './components/tabs/ScraperTab'

const TABS = [
  { id: 'daily', label: 'Daily', icon: CalendarCheck },
  { id: 'tracking', label: 'Tracking', icon: Activity },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'working', label: 'Working', icon: Wrench },
  { id: 'scraper', label: 'Scraper', icon: Search },
]

export default function App() {
  const store = useStore()
  const scraper = useScraperStore()
  const [active, setActive] = useState('daily')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  if (!isSupabaseConfigured) {
    return <ConfigScreen />
  }

  return (
    <div className="min-h-screen flex flex-col grain">
      <Header
        active={active}
        onChange={setActive}
        counts={{
          daily: store.dailyTasks.length,
          tracking: store.tracking.length,
          research: store.research.length,
          working: store.working.length,
          scraper: scraper.projects.length,
        }}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
        {store.error && (
          <div className="mb-4 px-4 py-3 text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-md flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold uppercase tracking-wider mb-1">
                Database error
              </div>
              <div className="font-mono">{store.error}</div>
              <div className="mt-1 text-fg-subtle">
                Check that your Supabase tables exist (see README.md).
              </div>
            </div>
          </div>
        )}

        {store.loading ? (
          <LoadingState />
        ) : (
          <>
            {active === 'daily' && <DailyTab store={store} />}
            {active === 'tracking' && <TrackingTab store={store} />}
            {active === 'research' && <ResearchTab store={store} />}
            {active === 'working' && <WorkingTab store={store} />}
            {active === 'scraper' && <ScraperTab scraper={scraper} onToast={showToast} />}
          </>
        )}
      </main>

      <footer className="border-t border-border px-6 py-3 text-[10px] text-fg-subtle font-mono flex items-center justify-between">
        <div>
          <span className="text-accent">●</span> connected{' '}
          <span className="ml-3">
            {store.dailyTasks.length} daily · {store.tracking.length} tracking ·{' '}
            {store.research.length} research ·{' '}
            {store.working.length} working ·{' '}
            {scraper.projects.length} scraped
          </span>
        </div>
        <div>crypto-tools / v1.0</div>
      </footer>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-md text-xs font-medium
          border animate-fade-in shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-900'
              : toast.type === 'success'
              ? 'bg-accent-bg/90 text-accent border-accent-dark'
              : 'bg-bg-elevated/90 text-fg-muted border-border'
          }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Header({ active, onChange, counts }) {
  return (
    <header className="border-b border-border bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="text-sm font-bold tracking-widest uppercase text-glow">
                DeFi Tracker
              </div>
              <div className="text-[10px] text-fg-subtle uppercase tracking-wider">
                farming · research · execution
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 p-1 bg-bg-elevated/40 border border-border rounded-md">
            {TABS.map((t) => {
              const Icon = t.icon
              const isActive = active === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => onChange(t.id)}
                  className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? 'bg-accent-bg text-accent shadow-inner-line'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-hover'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                  <span
                    className={`text-[10px] font-mono ${
                      isActive ? 'text-accent' : 'text-fg-subtle'
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="text-accent">
      <rect width="32" height="32" rx="6" fill="#052e16" />
      <path
        d="M8 22 L8 10 L14 10 L20 22 L20 10"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="24" cy="22" r="1.8" fill="currentColor" />
    </svg>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24 text-fg-subtle text-sm">
      <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse mr-2" />
      Loading…
    </div>
  )
}

function ConfigScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-bg-surface border border-border rounded-lg p-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="text-accent" size={20} />
          <h1 className="text-sm font-bold uppercase tracking-widest">Setup required</h1>
        </div>
        <p className="text-sm text-fg-muted leading-relaxed mb-4">
          Before launching the app, create a <code className="text-accent">.env.local</code>{' '}
          file at the project root with your Supabase credentials:
        </p>
        <pre className="bg-bg-elevated border border-border rounded-md p-4 text-xs leading-relaxed overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-xs text-fg-subtle mt-4 leading-relaxed">
          Then run the SQL from <code className="text-accent">supabase-schema.sql</code> in the
          Supabase SQL editor and restart the dev server.
        </p>
      </div>
    </div>
  )
}
