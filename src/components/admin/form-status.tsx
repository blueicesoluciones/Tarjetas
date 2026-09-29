interface Props {
  error?: string;
  success?: string;
}

export function FormStatus({ error, success }: Props) {
  if (!error && !success) return null;
  return (
    <div className="space-y-2" role="status">
      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p> : null}
    </div>
  );
}
