import { scenarios } from './scenarios';
import { randomizeShipment } from './scenarioVariants';
import { incrementTcn } from './workflow';

// The deployment's pieces. Trainees choose how many to process on the DSOE; pieces cycle
// through the six equipment types, so piece 7 is a second HMMWV with its own increment, TCN,
// and slightly different readings. Each piece is identified by its key; its id stays the
// equipment type that drives drawings, paperwork, and inspection findings.
export const MAX_PIECES = 12;

// The standard deployment uses each equipment type's base values for pieces 1–6. A random
// deployment (random given) varies every piece and its discrepancies; forced maps a piece key to
// discrepancy choices an instructor pinned.
export function createPieces({ random, forced = {} } = {}) {
  return Array.from({ length: MAX_PIECES }, (_, index) => {
    const template = scenarios[index % scenarios.length];
    const copy = Math.floor(index / scenarios.length) + 1;
    const key = index < scenarios.length ? template.id : `${template.id}-${copy}`;
    if (index < scenarios.length && !random) return { ...template, key };
    const varied = randomizeShipment(template, template, random || Math.random, forced[key]);
    return { ...varied, key, title: copy > 1 ? `${template.title} #${copy}` : template.title, tcn: incrementTcn(1, 1001 + index) };
  });
}

// Each piece position in the deployment: its key, display title, and equipment type.
export function pieceSlots() {
  return Array.from({ length: MAX_PIECES }, (_, index) => {
    const template = scenarios[index % scenarios.length];
    const copy = Math.floor(index / scenarios.length) + 1;
    return { key: index < scenarios.length ? template.id : `${template.id}-${copy}`, title: copy > 1 ? `${template.title} #${copy}` : template.title, template };
  });
}

// New readings and discrepancies for a piece, keeping its place and name in the deployment.
export function resetPiece(piece, random = Math.random, forced) {
  const template = scenarios.find(item => item.id === piece.id);
  return { ...randomizeShipment(template, piece, random, forced), key: piece.key, title: piece.title };
}
