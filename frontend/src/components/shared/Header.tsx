import { useState } from 'react'
import { Icon } from './Icon'

interface Project {
  id: string
  name: string
  location: string
}

interface HeaderProps {
  project: Project
  projects: Project[]
  onChangeProject: (p: Project) => void
}

/** Barra superior: brand + selector de proyecto + usuario. */
export function Header({ project, projects, onChangeProject }: HeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="hdr">
      <div className="hdr__brand">
        <Icon name="logo" size={22} style={{ color: '#0078D4' }} />
        <span className="name">Cost-Mapper</span>
      </div>

      <div className="hdr__center">
        <div className="proj-select" onClick={() => setOpen(o => !o)}>
          <Icon name="folder" size={16} style={{ color: '#9D9D9D' }} />
          <div className="proj-select__lines">
            <div className="proj-select__name">{project.name}</div>
            <div className="proj-select__loc">{project.location}</div>
          </div>
          <Icon name={open ? 'chevron_up' : 'chevron_down'} size={14} style={{ color: '#9D9D9D' }} />

          {open && (
            <div className="proj-popover" onClick={e => e.stopPropagation()}>
              {projects.map(p => (
                <div
                  key={p.id}
                  className="proj-popover__item"
                  onClick={() => { onChangeProject(p); setOpen(false) }}
                >
                  <div className="pn">{p.name}</div>
                  <div className="pl">{p.location}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hdr__right">
        <span style={{ color: '#9D9D9D', fontSize: 12 }}>F. Benítez</span>
        <div className="avatar">FB</div>
      </div>
    </div>
  )
}
