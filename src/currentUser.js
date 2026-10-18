// The signed-in person's display name, set by the sign-in gate before the app renders. CMOS shows
// it as the logged-in user and records it on history entries. Without sign-in (tests), it is
// the generic TRAINEE.
let name = '';

export function setCurrentUser(value) {
  name = String(value || '').trim();
}

export const cmosUser = () => (name ? name.toUpperCase() : 'TRAINEE');
