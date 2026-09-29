import "server-only";

type Weight = 400 | 600 | 800;

const cache = new Map<Weight, Promise<ArrayBuffer | null>>();

/**
 * Descarga Plus Jakarta Sans (TTF) desde Google Fonts para las imágenes
 * generadas con next/og. Si falla (sin red), se usa la fuente por defecto.
 */
function load(weight: Weight): Promise<ArrayBuffer | null> {
  const cached = cache.get(weight);
  if (cached) return cached;
  const promise = (async () => {
    try {
      const css = await fetch(`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}`).then((r) => r.text());
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) return null;
      return await fetch(url).then((r) => r.arrayBuffer());
    } catch {
      return null;
    }
  })();
  cache.set(weight, promise);
  return promise;
}

export async function ogFonts() {
  const weights: Weight[] = [400, 600, 800];
  const data = await Promise.all(weights.map(load));
  return weights.flatMap((weight, i) => {
    const font = data[i];
    return font ? [{ name: "Jakarta", data: font, weight, style: "normal" as const }] : [];
  });
}
