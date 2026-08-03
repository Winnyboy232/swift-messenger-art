export interface Country {
  code: string;
  dial: string;
  name: string;
  flag: string;
}

/** Common dialling codes with flags — Nigeria first as the app default. */
export const COUNTRIES: Country[] = [
  { code: "NG", dial: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "GH", dial: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", dial: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "EG", dial: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "PK", dial: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "AE", dial: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "ES", dial: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "IT", dial: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "PT", dial: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "IE", dial: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "SE", dial: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", dial: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", dial: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", dial: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", dial: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { code: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "KR", dial: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "PH", dial: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", dial: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", dial: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "TR", dial: "+90", name: "Türkiye", flag: "🇹🇷" },
  { code: "RU", dial: "+7", name: "Russia", flag: "🇷🇺" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0] as Country;

/**
 * Combines a dialling code with a locally typed number and returns strict E.164.
 * Strips spaces, hyphens, brackets and any leading zeros / duplicated country code.
 */
export function toE164(dial: string, local: string): string {
  const cc = dial.replace(/[^\d]/g, "");
  let digits = local.replace(/[^\d]/g, "");
  digits = digits.replace(/^0+/, "");
  if (cc && digits.startsWith(cc) && digits.length > cc.length) {
    digits = digits.slice(cc.length);
    digits = digits.replace(/^0+/, "");
  }
  return `+${cc}${digits}`;
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}
