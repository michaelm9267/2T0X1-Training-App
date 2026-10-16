import { useState } from "react";
import CdfCmosWorkspace from "./CdfCmosWorkspace";
import { newPracticeSession } from "../CargoWindow/practice";
export function Harness({
  initial = newPracticeSession({ section: "manifest", random: () => 0.2 }),
  page = "planning",
}) {
  const [session, setSession] = useState(initial);
  return (
    <CdfCmosWorkspace
      session={session}
      state={session.cdfCmos}
      initialPage={page}
      onClose={() => {}}
      onStateChange={(update) =>
        setSession((s) => ({ ...s, cdfCmos: update(s.cdfCmos) }))
      }
      onExerciseChange={(key, update) =>
        setSession((s) => ({
          ...s,
          exercises: { ...s.exercises, [key]: update(s.exercises[key]) },
        }))
      }
      onDepartureChange={(update) =>
        setSession((s) => ({ ...s, departure: update(s.departure) }))
      }
    />
  );
}
