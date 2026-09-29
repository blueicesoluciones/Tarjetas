import { Field } from "./fields";

export interface ProgramDefaults {
  card_title: string;
  stamps_required: number;
  reward_description: string;
  stamp_cooldown_minutes: number;
  undo_window_minutes: number;
}

export const EMPTY_PROGRAM: ProgramDefaults = {
  card_title: "",
  stamps_required: 10,
  reward_description: "",
  stamp_cooldown_minutes: 60,
  undo_window_minutes: 5,
};

export function ProgramFields({ defaults }: { defaults: ProgramDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Título de la tarjeta" name="card_title" defaultValue={defaults.card_title} required maxLength={80} placeholder="Tarjeta Café Luna" />
      <Field label="Premio" name="reward_description" defaultValue={defaults.reward_description} required maxLength={200} placeholder="Un café gratis" />
      <Field label="Sellos requeridos" name="stamps_required" type="number" min={2} max={30} defaultValue={defaults.stamps_required} required />
      <Field
        label="Tiempo mínimo entre sellos (min)"
        name="stamp_cooldown_minutes"
        type="number"
        min={0}
        max={10080}
        defaultValue={defaults.stamp_cooldown_minutes}
        required
        hint="0 = sin límite"
      />
      <Field
        label="Ventana para deshacer (min)"
        name="undo_window_minutes"
        type="number"
        min={0}
        max={1440}
        defaultValue={defaults.undo_window_minutes}
        required
      />
    </div>
  );
}
