/** Class names joined with spaces, skipping the ones left out: cx(s.form, open && s.open, layout.form). */
export const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
