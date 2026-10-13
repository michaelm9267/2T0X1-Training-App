import React from 'react'
import './process-panel.css'
import { FREQUENT_LINKS } from './frequentLinks'

function ProcessPanel({ steps, selectedStepId, onSelectStep, completedStages = [], lockedSteps = {}, onViewDsoe, dsoeViewed = false, title = 'CDF Process', label = 'CDF process steps', links = FREQUENT_LINKS }) {
  return (
    <nav className="process-panel" aria-label={label}>
      <h2>{title}</h2>
      {onViewDsoe && <div className="dsoe-entry">
        <button type="button" className="process-step dsoe-button" onClick={onViewDsoe}>View DSOE</button>
        <span className={dsoeViewed ? 'stage-complete-label' : 'dsoe-start-label'}>{dsoeViewed ? 'Reviewed' : 'Start here'}</span>
      </div>}
      <ol className="process-steps">
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              className="process-step"
              aria-current={selectedStepId === step.id ? 'step' : undefined}
              aria-controls="training-section"
              aria-describedby={lockedSteps[step.id] ? `locked-${step.id}` : undefined}
              disabled={Boolean(lockedSteps[step.id])}
              onClick={() => onSelectStep(step)}
            >
              {index + 1}. {step.title}
            </button>
            {completedStages.includes(step.id) && <span className="stage-complete-label">Complete</span>}
            {lockedSteps[step.id] && <span className="stage-locked-label" id={`locked-${step.id}`}>{lockedSteps[step.id]}</span>}
          </li>
        ))}
      </ol>
      <section className="frequent-links" aria-labelledby="frequent-links-title">
        <h2 id="frequent-links-title">Frequent links</h2>
        {links.map(({ group, links }) => (
          <details key={group}>
            <summary>{group}</summary>
            <ul>{links.map(([title, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{title}</a></li>)}</ul>
          </details>
        ))}
        <p className="frequent-links-note">Opens in a new tab. Some .mil sites need a CAC or a government network.</p>
      </section>
    </nav>
  )
}

export default ProcessPanel
