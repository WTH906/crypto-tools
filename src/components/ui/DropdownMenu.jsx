import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

const MENU_WIDTH = 160
const MENU_GAP = 4
const VIEWPORT_PADDING = 8

export default function DropdownMenu({ items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  // Position the menu relative to the button each time it opens.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? 0
    const menuWidth = menuRef.current?.offsetWidth ?? MENU_WIDTH

    // Default: drop down from below the button
    let top = rect.bottom + MENU_GAP
    // If it would overflow the viewport bottom, flip above the button
    if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
      top = rect.top - MENU_GAP - menuHeight
    }

    // Horizontal: align to right edge of button by default, clamp to viewport
    let left =
      align === 'right' ? rect.right - menuWidth : rect.left
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING)
    )

    setPos({ top, left })
  }, [open, align])

  // Close on outside click, Escape, scroll, or resize.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (
        buttonRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScrollOrResize = () => setOpen(false)

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    // Capture phase so we close on any ancestor scroll, not just the page
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-elevated transition-colors"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              minWidth: MENU_WIDTH
            }}
            className="z-[60] bg-bg-surface border border-border rounded-md shadow-xl overflow-hidden animate-fade-in"
          >
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => {
                  setOpen(false)
                  it.onClick?.()
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                  it.danger
                    ? 'text-red-400 hover:bg-red-950/40'
                    : 'text-fg hover:bg-bg-elevated'
                }`}
              >
                {it.icon && <span className="opacity-80">{it.icon}</span>}
                {it.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
