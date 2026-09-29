import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { staffForApi } from "@/lib/auth/staff";
import { BACKGROUND_OVERLAY_ALPHA } from "@/lib/cards/card-style";
import { appUrl } from "@/lib/env";
import { jsonError } from "@/lib/http/json";
import { ogFonts } from "@/lib/og-fonts";

const W = 1080;
const H = 1350;

/** Afiche para compartir en redes o imprimir: bienvenida + tarjeta de ejemplo + QR. */
export async function GET(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx?.businessId) return jsonError("No autorizado", 403);
  const { business, program } = await getBusinessWithProgram(ctx.businessId);
  if (!business || !program) return jsonError("Negocio no encontrado", 404);

  const url = appUrl(`/n/${business.slug}`);
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 560,
    errorCorrectionLevel: "M",
    color: { dark: "#111111" },
  });
  const bg = business.primary_color;
  const fg = business.text_color;
  // Satori no soporta WEBP: en ese caso se usa la inicial.
  const logo = business.logo_url && !/\.webp($|\?)/i.test(business.logo_url) ? business.logo_url : null;
  const required = program.stamps_required;
  const sample = Math.min(required - 1, Math.max(2, Math.round(required * 0.6)));
  const dot = required <= 10 ? 60 : required <= 20 ? 44 : 34;
  const fonts = await ogFonts();
  const download = new URL(request.url).searchParams.has("descargar");

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        backgroundColor: bg,
        color: fg,
        fontFamily: fonts.length ? "Jakarta" : undefined,
        padding: "72px 80px 64px",
      }}
    >
      {business.card_background_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
        <img
          src={business.card_background_url}
          alt=""
          width={W}
          height={H}
          style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }}
        />
      ) : null}
      {business.card_background_url ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            backgroundColor: `${bg}${BACKGROUND_OVERLAY_ALPHA}`,
          }}
        />
      ) : null}

      {/* Logo, nombre y bienvenida */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
          <img
            src={logo}
            alt=""
            width={132}
            height={132}
            style={{
              borderRadius: 132,
              objectFit: "cover",
              border: `5px solid ${fg}`,
              backgroundColor: "#fff",
            }}
          />
        ) : (
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 132,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: fg,
              color: bg,
              fontSize: 64,
              fontWeight: 800,
            }}
          >
            {business.name.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", marginTop: 22, fontSize: 40, fontWeight: 600, opacity: 0.9 }}>
          {business.name}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 26,
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.05,
            textAlign: "center",
            letterSpacing: -1.5,
          }}
        >
          <span>¡Bienvenido a nuestro</span>
          <span>programa de fidelidad!</span>
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, opacity: 0.9, textAlign: "center" }}>
          {`Junta ${required} sellos y gana: ${program.reward_description}`}
        </div>
      </div>

      {/* Tarjeta de ejemplo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 860,
          padding: "34px 40px",
          borderRadius: 36,
          backgroundColor: `${fg}22`,
          border: `2px solid ${fg}55`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.85 }}>
          <span>{program.card_title}</span>
          <span>{`${sample} / ${required}`}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 }}>
          {Array.from({ length: required }, (_, i) => (
            <div
              key={i}
              style={{
                width: dot,
                height: dot,
                borderRadius: dot,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `4px solid ${fg}`,
                backgroundColor: i < sample ? fg : "transparent",
                opacity: i < sample ? 1 : 0.6,
              }}
            >
              {i < sample ? (
                <svg width={dot * 0.55} height={dot * 0.55} viewBox="0 0 24 24">
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    fill="none"
                    stroke={bg}
                    strokeWidth={3.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : i === required - 1 ? (
                <svg width={dot * 0.55} height={dot * 0.55} viewBox="0 0 24 24">
                  <path
                    d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z"
                    fill={fg}
                  />
                </svg>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* QR */}
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <div style={{ display: "flex", padding: 20, borderRadius: 32, backgroundColor: "#FFFFFF" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
          <img src={qr} alt="" width={360} height={360} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 420 }}>
          <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1 }}>Escanea y crea tu tarjeta</span>
          <span style={{ fontSize: 28, marginTop: 14, opacity: 0.9 }}>
            Sin apps ni contraseñas. Solo tu nombre, teléfono y un PIN.
          </span>
          <span style={{ fontSize: 22, marginTop: 18, opacity: 0.7 }}>{url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    </div>,
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: {
        "Cache-Control": "private, no-store",
        ...(download ? { "Content-Disposition": `attachment; filename="tarjeta-${business.slug}.png"` } : {}),
      },
    },
  );
}
