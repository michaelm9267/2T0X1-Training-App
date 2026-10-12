// Mistakes recorded as the trainee works, for scoring and the after-action report. Each entry
// keeps what went wrong and the reference that covers it.
export function recordMistake(e, kind, detail, reference) {
  return { ...e, mistakes: [...(e.mistakes || []), { kind, detail, reference, at: Date.now() }] };
}
