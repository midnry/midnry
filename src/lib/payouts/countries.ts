// Client-safe payout constants (no crypto imports).

export type MaskedDetails = {
  holder: string;
  bank: string;
  account: string;
  country: string;
  countryName: string;
  updatedAt: string;
};

export const PAYOUT_COUNTRIES: { code: string; name: string }[] = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "TZ", name: "Tanzania" },
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "SN", name: "Senegal" },
  { code: "CM", name: "Cameroon" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "IN", name: "India" },
];

export function countryName(code: string): string {
  return PAYOUT_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
