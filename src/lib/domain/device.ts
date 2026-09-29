export type DevicePlatform = "ios" | "android" | "desktop";

export interface DeviceInfo {
  platform: DevicePlatform;
  inAppBrowser: string | null;
}

const IN_APP_PATTERNS: Array<[RegExp, string]> = [
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/WhatsApp/i, "WhatsApp"],
  [/TikTok|musical_ly|BytedanceWebview/i, "TikTok"],
  [/Line\//i, "LINE"],
  [/Snapchat/i, "Snapchat"],
  [/Twitter/i, "X"],
];

/**
 * Detección por User-Agent (CLAUDE.md §6.10, §6.11). En el cliente se refuerza
 * iPadOS (se reporta como Mac con pantalla táctil) con `maxTouchPoints`.
 */
export function detectDevice(userAgent: string): DeviceInfo {
  const ua = userAgent || "";
  let platform: DevicePlatform = "desktop";
  if (/iPhone|iPad|iPod/i.test(ua)) platform = "ios";
  else if (/Android/i.test(ua)) platform = "android";

  const match = IN_APP_PATTERNS.find(([re]) => re.test(ua));
  return { platform, inAppBrowser: match ? match[1] : null };
}
