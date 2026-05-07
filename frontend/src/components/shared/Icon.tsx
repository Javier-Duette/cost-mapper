const ICONS: Record<string, string> = {
  catalog:      `<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>`,
  budget:       `<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><line x1="3.5" y1="9" x2="20.5" y2="9"/><line x1="9" y1="9" x2="9" y2="20"/><line x1="14" y1="13" x2="17.5" y2="13"/><line x1="15.75" y1="11.25" x2="15.75" y2="14.75"/><line x1="14" y1="17" x2="17.5" y2="17"/>`,
  mapping:      `<path d="M12 3.5 L20 7.5 L20 16.5 L12 20.5 L4 16.5 L4 7.5 Z"/><path d="M12 3.5 L12 11.5"/><path d="M4 7.5 L12 11.5 L20 7.5"/><circle cx="12" cy="11.5" r="1.4" fill="currentColor" stroke="none"/>`,
  library:      `<path d="M4 5.5 a1.5 1.5 0 0 1 1.5 -1.5 H10 a1.5 1.5 0 0 1 1.5 1.5 V20 H5.5 a1.5 1.5 0 0 1 -1.5 -1.5 Z"/><path d="M12.5 5.5 a1.5 1.5 0 0 1 1.5 -1.5 H18.5 a1.5 1.5 0 0 1 1.5 1.5 V18.5 a1.5 1.5 0 0 1 -1.5 1.5 H12.5 Z"/>`,
  reports:      `<path d="M6 3.5 H15 L19 7.5 V20 a0.5 0.5 0 0 1 -0.5 0.5 H6 a0.5 0.5 0 0 1 -0.5 -0.5 V4 A0.5 0.5 0 0 1 6 3.5 Z"/><path d="M14.5 3.5 V8 H19"/><line x1="9" y1="17" x2="9" y2="14"/><line x1="12.5" y1="17" x2="12.5" y2="11.5"/><line x1="16" y1="17" x2="16" y2="13"/>`,
  settings:     `<circle cx="12" cy="12" r="2.5"/><path d="M12 3.5 L13.2 5.7 L15.6 5 L16.4 7.4 L18.8 7.8 L18.4 10.4 L20.5 12 L18.4 13.6 L18.8 16.2 L16.4 16.6 L15.6 19 L13.2 18.3 L12 20.5 L10.8 18.3 L8.4 19 L7.6 16.6 L5.2 16.2 L5.6 13.6 L3.5 12 L5.6 10.4 L5.2 7.8 L7.6 7.4 L8.4 5 L10.8 5.7 Z"/>`,
  search:       `<circle cx="10.5" cy="10.5" r="6"/><line x1="15" y1="15" x2="20" y2="20"/>`,
  filter:       `<path d="M4 5 H20 L14.5 12 V19 L9.5 16.5 V12 Z"/>`,
  chevron_down: `<polyline points="6,9.5 12,15.5 18,9.5"/>`,
  chevron_up:   `<polyline points="6,14.5 12,8.5 18,14.5"/>`,
  chevron_right:`<polyline points="9.5,6 15.5,12 9.5,18"/>`,
  chevron_left: `<polyline points="14.5,6 8.5,12 14.5,18"/>`,
  close:        `<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>`,
  check:        `<polyline points="5,12.5 10,17.5 19.5,7"/>`,
  warning:      `<path d="M12 3.5 L21 19.5 L3 19.5 Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.4" fill="currentColor" stroke="none"/>`,
  export:       `<path d="M5 14.5 V18 a1 1 0 0 0 1 1 H18 a1 1 0 0 0 1 -1 V14.5"/><line x1="12" y1="14.5" x2="12" y2="4"/><polyline points="8,7.5 12,4 16,7.5"/>`,
  import:       `<path d="M5 14.5 V18 a1 1 0 0 0 1 1 H18 a1 1 0 0 0 1 -1 V14.5"/><line x1="12" y1="4" x2="12" y2="14.5"/><polyline points="8,11 12,14.5 16,11"/>`,
  add:          `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  edit:         `<path d="M4 20 L8 19 L19 8 L16 5 L5 16 Z"/><line x1="14" y1="7" x2="17" y2="10"/>`,
  pin:          `<path d="M14 3.5 L20.5 10 L17 11 L13.5 16 L8 10.5 L13 7 Z"/><line x1="8" y1="10.5" x2="3.5" y2="20.5"/>`,
  folder:       `<path d="M3.5 7 a1 1 0 0 1 1 -1 H9.5 L11.5 8 H19.5 a1 1 0 0 1 1 1 V18 a1 1 0 0 1 -1 1 H4.5 a1 1 0 0 1 -1 -1 Z"/>`,
  logo:         `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 13 L11 16 L16 8" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.4" fill="currentColor" stroke="none"/>`,
  orbit:        `<ellipse cx="12" cy="12" rx="8.5" ry="3.5"/><ellipse cx="12" cy="12" rx="3.5" ry="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>`,
  zoom_extents: `<polyline points="9,4 4,4 4,9"/><polyline points="15,4 20,4 20,9"/><polyline points="20,15 20,20 15,20"/><polyline points="9,20 4,20 4,15"/>`,
  reset:        `<path d="M4 12 a8 8 0 0 1 13.5 -5.5"/><polyline points="14,3 17.5,6.5 14,10"/>`,
  wireframe:    `<path d="M12 3.5 L20.5 7.5 L20.5 16.5 L12 20.5 L3.5 16.5 L3.5 7.5 Z" stroke-dasharray="2 2"/>`,
  file_ifc:     `<path d="M6 3.5 H15 L19 7.5 V20.5 H6 Z"/><path d="M14.5 3.5 V8 H19"/><text x="9" y="16" font-size="5" fill="currentColor" stroke="none" font-weight="600">IFC</text>`,
  info:         `<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,
}

interface IconProps {
  name: string
  size?: number
  style?: React.CSSProperties
  className?: string
}

/** Inline SVG icon using design system icon set. */
export function Icon({ name, size = 16, style, className }: IconProps) {
  const body = ICONS[name]
  if (!body) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}
