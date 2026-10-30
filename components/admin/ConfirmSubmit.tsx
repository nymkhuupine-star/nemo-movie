"use client";

/** A form with hidden fields and one submit button that asks first. */
export default function ConfirmSubmit({
  action,
  fields,
  confirmText,
  children,
  className = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  confirmText: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
