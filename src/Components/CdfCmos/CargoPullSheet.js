import FloatingWindow from "../Session/FloatingWindow";
export default function CargoPullSheet({ manifest, pieces, onClose }) {
  return (
    <FloatingWindow
      title="Cargo Pull Sheet"
      label="Cargo Pull Sheet"
      onClose={onClose}
      className="paper-sheet print-manifest"
      printable
    >
      <p className="paper-banner">FOR TRAINING USE ONLY — FICTIONAL DOCUMENT</p>
      <header className="paper-header">
        <strong>Cargo Pull Sheet</strong>
        <span>
          Manifest {manifest.number} · Mission {manifest.mission}
        </span>
      </header>
      <div className="paper-boxes">
        {[
          ["DSOE ID", manifest.dsoeId],
          ["Chalk", manifest.chalk],
          ["APOD", manifest.pod],
          ["Total pieces", pieces.length],
          [
            "Total weight (lb)",
            pieces.reduce((n, p) => n + Number(p.record.weight), 0),
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div className="paper-table">
        <table>
          <thead>
            <tr>
              <th>Pallet / Loose</th>
              <th>TCN</th>
              <th>Nomenclature</th>
              <th>Pieces</th>
              <th>Weight</th>
              <th>Location</th>
              <th>Pulled</th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p) => (
              <tr key={p.scenarioId}>
                <td>{p.palletId || "Loose"}</td>
                <td>{p.record.tcn}</td>
                <td>{p.record.description}</td>
                <td>{p.record.pieces}</td>
                <td>{p.record.weight}</td>
                <td>CDF</td>
                <td>□</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FloatingWindow>
  );
}
