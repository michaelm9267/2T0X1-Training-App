import { useCallback, useRef, useState } from "react";
import useModalDialog from "../Training/useModalDialog";
import { PaperworkButton } from "../Cmos/PaperworkWindow";
// `bare` draws a plain CMOS title bar (no Paperwork or × buttons); Escape still closes it.
export function Dialog({ title, onClose, children, wide = false, overlayClassName = "", heading = title, bare = false }) {
  const ref = useRef(null),
    callback = useRef(onClose);
  callback.current = onClose;
  const close = useCallback(() => callback.current(), []);
  useModalDialog(ref, close);
  return (
    <div className={`cdf-dialog-overlay ${overlayClassName}`}>
      <section
        className={`cdf-dialog ${wide ? "cdf-dialog-wide" : ""} ${bare ? "cdf-dialog-bare" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <h3>{heading}</h3>
          {!bare && <span className="cdf-dialog-actions">
            <PaperworkButton />
            <button type="button" aria-label={`Close ${title}`} onClick={close}>
              ×
            </button>
          </span>}
        </header>
        {children}
      </section>
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  options,
  disabled = false,
  readOnly = false,
  type = "text",
  required = false,
}) {
  return (
    <label className="cdf-field">
      <span>
        {required ? "* " : ""}
        {label}
      </span>
      {options ? (
        <select
          aria-label={label}
          disabled={disabled || readOnly}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" />
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label={label}
          required={required}
          type={type}
          disabled={disabled}
          readOnly={readOnly}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </label>
  );
}
export function Confirm({
  title = "Unsaved changes",
  message,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p>{message}</p>
      <footer>
        <button type="button" onClick={onConfirm}>
          OK
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </footer>
    </Dialog>
  );
}
export function useDiscard(dirty, onClose) {
  const [confirm, setConfirm] = useState(false);
  return {
    requestClose: () => (dirty ? setConfirm(true) : onClose()),
    confirmation: confirm ? (
      <Confirm
        message="Discard unsaved changes?"
        onConfirm={onClose}
        onCancel={() => setConfirm(false)}
      />
    ) : null,
  };
}
