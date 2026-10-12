import React from 'react'
import Navbar from '../Components/Navbar/Navbar'

function Layout({ children, activeModule, onModuleChange }) {
  return (
    <div className="layout-container">
    <Navbar activeModule={activeModule} onModuleChange={onModuleChange} />
    <div className="main-container" id="module-panel" role="tabpanel" aria-labelledby={`module-tab-${activeModule}`}>
      {children}
    </div>
    </div>
  )
}

export default Layout
