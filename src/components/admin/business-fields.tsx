"use client";

import { useState } from "react";
import { slugify } from "@/lib/admin/schemas";
import { ColorField } from "./color-field";
import { COUNTRY_OPTIONS, Field, SelectField, STATUS_LABELS, TIMEZONE_OPTIONS } from "./fields";

export interface BusinessDefaults {
  name: string;
  slug: string;
  primary_color: string;
  text_color: string;
  default_country: string;
  timezone: string;
  contact_whatsapp: string;
  status: "trial" | "active" | "suspended";
}

export const EMPTY_BUSINESS: BusinessDefaults = {
  name: "",
  slug: "",
  primary_color: "#111827",
  text_color: "#FFFFFF",
  default_country: "CO",
  timezone: "America/Bogota",
  contact_whatsapp: "",
  status: "trial",
};

/** Campos del negocio. En alta, el slug se sugiere a partir del nombre. */
export function BusinessFields({ defaults, isNew }: { defaults: BusinessDefaults; isNew: boolean }) {
  const [name, setName] = useState(defaults.name);
  const [slug, setSlug] = useState(defaults.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const statuses = (isNew ? (["trial", "active"] as const) : (["trial", "active", "suspended"] as const)).map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Nombre del negocio"
        name="name"
        value={name}
        required
        maxLength={120}
        onChange={(e) => {
          setName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
      />
      <Field
        label="Slug (enlace público)"
        name="slug"
        value={slug}
        required
        maxLength={60}
        pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
        hint={`Enlace: /n/${slug || "mi-negocio"}`}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
      />
      <ColorField label="Color principal" name="primary_color" defaultValue={defaults.primary_color} />
      <ColorField label="Color del texto" name="text_color" defaultValue={defaults.text_color} />
      <SelectField label="País (teléfonos)" name="default_country" defaultValue={defaults.default_country} options={withCurrent(COUNTRY_OPTIONS, defaults.default_country)} />
      <SelectField label="Zona horaria" name="timezone" defaultValue={defaults.timezone} options={withCurrent(TIMEZONE_OPTIONS, defaults.timezone)} />
      <Field
        label="WhatsApp de contacto (opcional)"
        name="contact_whatsapp"
        type="tel"
        defaultValue={defaults.contact_whatsapp}
        maxLength={25}
        hint="Se muestra en “Olvidé mi PIN”"
      />
      <SelectField label="Estado" name="status" defaultValue={defaults.status} options={statuses} />
    </div>
  );
}

function withCurrent(options: { value: string; label: string }[], current: string) {
  return options.some((o) => o.value === current) ? options : [...options, { value: current, label: current }];
}
