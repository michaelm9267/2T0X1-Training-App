import React from 'react'
import './navbar.css'

const trainingModules = [
  { id: 'cdf', label: 'CDF Training' },
  { id: 'pdf', label: 'PDF Training' },
  { id: 'outbound', label: 'Outbound Training' },
  { id: 'inbound', label: 'Inbound Training' },
  { id: 'hhg', label: 'HHG Training' },
  { id: 'pax', label: 'PAX Training' },
]

function Navbar({ activeModule, onModuleChange }) {
  return (
    <header className="navbar-container">
        <div className="app-brand">
          <img src={`${process.env.PUBLIC_URL}/rampready-mark.svg`} alt="RampReady logo" />
          <div>
            <h1 className="page-title">RampReady</h1>
            <span className="brand-subtitle">2T0X1 Training Portal</span>
          </div>
        </div>
        <nav className="module-tabs" aria-label="Training modules">
          <div role="tablist" aria-label="Training modules">
            {trainingModules.map(module => (
              <button
                type="button"
                role="tab"
                id={`module-tab-${module.id}`}
                aria-controls="module-panel"
                aria-selected={activeModule === module.id}
                tabIndex={activeModule === module.id ? 0 : -1}
                key={module.id}
                onClick={() => onModuleChange(module.id)}
              >
                {module.label}
              </button>
            ))}
          </div>
        </nav>
    </header>
  )
}

export default Navbar
