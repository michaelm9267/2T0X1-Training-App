import { withdrawCdfAssignments } from '../Cmos/courseAdapters';
import { useEffect } from "react";
import {
  emptyCdfCmos,
  manifestBasis,
  reconcileCdfCmos,
  unassignCargo,
} from "./manifestLogic";
import { removeFromManifest } from "../CargoWindow/workflow";
export default function useCdfCmos({ state, setState, context, setExercises }) {
  const basis = manifestBasis(state, context);
  useEffect(() => {
    setState((previous) => reconcileCdfCmos(previous, context));
  }, [basis]); // eslint-disable-line react-hooks/exhaustive-deps
  // A correction elsewhere in CDF withdraws its assignment and final inspection progress.
  const invalid = state.assignments
    .filter((a) =>
      a.pieceKeys.some(
        (k) =>
          !context.pieceKeys.includes(k) ||
          !context.exercises[k]?.manifestAccepted,
      ),
    )
    .map((a) => a.id)
    .join("|");
  useEffect(() => {
    if (invalid)
      setState((previous) => {
        let next = previous;const removed=previous.assignments.filter(a=>invalid.split('|').includes(a.id)).flatMap(a=>a.pieceKeys);
        for (const id of invalid.split("|"))
          next = unassignCargo(next, id, context).state;
        return {...next,...(next.sharedCmos?{sharedCmos:withdrawCdfAssignments(next.sharedCmos,removed)}:{})};
      });
  }, [invalid]); // eslint-disable-line react-hooks/exhaustive-deps
  const onStateChange = (update) => {
    if (context.finished) return;
    const next = update(state),
      assigned = next.assignments.flatMap((a) => a.pieceKeys);
    setState(next);
    setExercises((previous) =>
      Object.fromEntries(
        Object.entries(previous).map(([key, e]) => {
          if (assigned.includes(key))
            return [
              key,
              {
                ...e,
                manifestAccepted: true,
                manifestRecord: e.shipmentRecord || e.manifestRecord,
                firstActionAt: e.firstActionAt || Date.now(),
              },
            ];
          return [key, e.manifestAccepted ? removeFromManifest(e) : e];
        }),
      ),
    );
  };
  const onExerciseChange = (key, update) => {
    if (!context.finished)
      setExercises((previous) => ({
        ...previous,
        [key]: {
          ...update(previous[key]),
          firstActionAt: previous[key].firstActionAt || Date.now(),
        },
      }));
  };
  const removePiece = (key) => {
    const a = state.assignments.find((a) => a.pieceKeys.includes(key));
    if(a)onStateChange(()=>{const next=unassignCargo(state,a.id,context).state;return {...next,...(next.sharedCmos?{sharedCmos:withdrawCdfAssignments(next.sharedCmos,[key])}:{})};});
  };
  return { onStateChange, onExerciseChange, removePiece };
}
export { emptyCdfCmos };
