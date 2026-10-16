import { useCallback, useRef, useState } from "react";
import useModalDialog from "../Training/useModalDialog";
export function Dialog({ title, onClose, children, wide = false, overlayClassName = "", heading = title }) {
  const ref = useRef(null),
    callback = useRef(onClose);
  callback.current = onClose;
  const close = useCallback(() => callback.current(), []);
  useModalDialog(ref, close);
  return (
    <div className={`cdf-dialog-overlay ${overlayClassName}`}>
      <section
        className={`cdf-dialog ${wide ? "cdf-dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <h3>{heading}</h3>
          <button type="button" aria-label={`Close ${title}`} onClick={close}>
            ×
          </button>
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
