export const COUNTRIES = [
  { id: "global", name: "Global" },
  { id: "NG", name: "Nigeria" },
  { id: "US", name: "United States" },
  { id: "GB", name: "United Kingdom" },
  { id: "CA", name: "Canada" },
  { id: "AU", name: "Australia" },
  { id: "IN", name: "India" },
  { id: "AE", name: "United Arab Emirates" },
  { id: "GH", name: "Ghana" },
  { id: "KE", name: "Kenya" },
  { id: "ZA", name: "South Africa" },
  { id: "DE", name: "Germany" },
  { id: "FR", name: "France" },
  { id: "BR", name: "Brazil" },
  { id: "MX", name: "Mexico" },
  { id: "JP", name: "Japan" },
  { id: "CN", name: "China" },
  { id: "PH", name: "Philippines" },
] as const;

export type CountryId = (typeof COUNTRIES)[number]["id"];

export const PLAN_YEARS = [2026, 2027] as const;
export type PlanYear = (typeof PLAN_YEARS)[number];

const ALL = COUNTRIES.map((country) => country.id).filter((id) => id !== "global");

const CHRISTMAS = ["NG", "US", "GB", "CA", "AU", "IN", "ZA", "GH", "KE", "DE", "FR", "BR", "MX", "PH", "JP"];
const EID = ["NG", "AE", "IN", "GH", "KE", "GB", "US", "CA", "FR", "DE", "ZA", "AU", "PH"];
const DIWALI = ["IN", "GB", "US", "CA", "AU", "AE", "KE", "ZA"];
const MAY_MOTHERS = ["US", "CA", "AU", "NG", "GH", "KE", "ZA", "IN", "PH", "JP", "CN", "DE", "BR", "MX"];
const FATHERS = ["US", "GB", "CA", "AU", "NG", "GH", "KE", "ZA", "IN", "PH", "DE", "FR", "BR", "MX", "JP"];
const HALLOWEEN = ["US", "GB", "CA", "AU", "DE", "PH"];
const BLACK_FRIDAY = ["US", "CA", "GB", "AU", "DE", "NG", "ZA", "BR", "MX", "IN", "PH", "AE", "KE", "GH", "JP", "FR"];
const WORKERS = ["NG", "GH", "KE", "ZA", "IN", "DE", "FR", "BR", "MX", "CN", "PH"];
const FOOTBALL = ["NG", "US", "GB", "CA", "MX", "BR", "DE", "FR", "GH", "KE", "ZA", "JP", "AU", "IN", "PH", "AE"];
const JEWISH = ["US", "CA", "GB", "FR", "DE", "AU"];

type Holiday = {
  name: string;
  countries: readonly string[];
  when: Partial<Record<PlanYear, string>>;
};

function fixed(name: string, monthDay: string, countries: readonly string[]): Holiday {
  return {
    name,
    countries,
    when: { 2026: `2026-${monthDay}`, 2027: `2027-${monthDay}` },
  };
}

const HOLIDAYS: Holiday[] = [
  fixed("New Year's Day", "01-01", ALL),
  fixed("New Year's Eve", "12-31", ALL),
  fixed("Valentine's Day", "02-14", ALL.filter((id) => id !== "AE")),
  fixed("International Women's Day", "03-08", ALL),
  fixed("Earth Day", "04-22", ALL),
  fixed("Labour Day", "05-01", WORKERS),
  { name: "Mother's Day", countries: MAY_MOTHERS, when: { 2026: "2026-05-10", 2027: "2027-05-09" } },
  { name: "Mother's Day", countries: ["GB"], when: { 2026: "2026-03-15", 2027: "2027-03-14" } },
  { name: "Mother's Day", countries: ["FR"], when: { 2026: "2026-05-31", 2027: "2027-05-30" } },
  { name: "Father's Day", countries: FATHERS, when: { 2026: "2026-06-21", 2027: "2027-06-20" } },
  { name: "Easter", countries: CHRISTMAS, when: { 2026: "2026-04-05", 2027: "2027-03-28" } },
  fixed("Christmas Day", "12-25", CHRISTMAS),
  fixed("Boxing Day", "12-26", ["GB", "CA", "AU", "NG", "ZA", "GH", "KE"]),
  { name: "Lunar New Year", countries: ["CN", "US", "CA", "AU", "GB", "PH"], when: { 2026: "2026-02-17", 2027: "2027-02-06" } },
  { name: "Holi", countries: ["IN"], when: { 2026: "2026-03-04", 2027: "2027-03-22" } },
  { name: "Eid al-Fitr", countries: EID, when: { 2026: "2026-03-20", 2027: "2027-03-09" } },
  { name: "Eid al-Adha", countries: EID, when: { 2026: "2026-05-27", 2027: "2027-05-16" } },
  { name: "Diwali", countries: DIWALI, when: { 2026: "2026-11-08", 2027: "2027-10-29" } },
  { name: "Dussehra", countries: ["IN"], when: { 2026: "2026-10-20", 2027: "2027-10-09" } },
  { name: "Hanukkah begins", countries: JEWISH, when: { 2026: "2026-12-04", 2027: "2027-12-24" } },
  { name: "Passover", countries: JEWISH, when: { 2026: "2026-04-02", 2027: "2027-04-22" } },
  { name: "Rosh Hashanah", countries: JEWISH, when: { 2026: "2026-09-12", 2027: "2027-10-02" } },
  fixed("Halloween", "10-31", HALLOWEEN),
  { name: "Black Friday", countries: BLACK_FRIDAY, when: { 2026: "2026-11-27", 2027: "2027-11-26" } },
  { name: "Cyber Monday", countries: BLACK_FRIDAY, when: { 2026: "2026-11-30", 2027: "2027-11-29" } },
  fixed("Singles' Day", "11-11", ["CN"]),
  { name: "Martin Luther King Jr. Day", countries: ["US"], when: { 2026: "2026-01-19", 2027: "2027-01-18" } },
  { name: "Super Bowl", countries: ["US"], when: { 2026: "2026-02-08", 2027: "2027-02-14" } },
  { name: "Presidents Day", countries: ["US"], when: { 2026: "2026-02-16", 2027: "2027-02-15" } },
  fixed("Black History Month begins", "02-01", ["US", "CA"]),
  fixed("St Patrick's Day", "03-17", ["US", "GB", "CA", "AU"]),
  { name: "Memorial Day", countries: ["US"], when: { 2026: "2026-05-25", 2027: "2027-05-31" } },
  fixed("Juneteenth", "06-19", ["US"]),
  fixed("Pride Month begins", "06-01", ["US", "GB", "CA", "AU", "DE", "FR", "BR", "MX", "ZA", "PH"]),
  fixed("Independence Day", "07-04", ["US"]),
  { name: "Labor Day", countries: ["US"], when: { 2026: "2026-09-07", 2027: "2027-09-06" } },
  fixed("Veterans Day", "11-11", ["US"]),
  { name: "Thanksgiving", countries: ["US"], when: { 2026: "2026-11-26", 2027: "2027-11-25" } },
  fixed("Kwanzaa begins", "12-26", ["US"]),
  fixed("Cinco de Mayo", "05-05", ["US", "MX"]),
  { name: "Early May bank holiday", countries: ["GB"], when: { 2026: "2026-05-04", 2027: "2027-05-03" } },
  fixed("Bonfire Night", "11-05", ["GB"]),
  fixed("Remembrance Day", "11-11", ["GB", "CA", "AU"]),
  { name: "Thanksgiving", countries: ["CA"], when: { 2026: "2026-10-12", 2027: "2027-10-11" } },
  fixed("Canada Day", "07-01", ["CA"]),
  { name: "Victoria Day", countries: ["CA"], when: { 2026: "2026-05-18", 2027: "2027-05-24" } },
  fixed("Australia Day", "01-26", ["AU"]),
  fixed("ANZAC Day", "04-25", ["AU"]),
  { name: "Labour Day", countries: ["AU"], when: { 2026: "2026-10-05", 2027: "2027-10-04" } },
  fixed("Republic Day", "01-26", ["IN"]),
  fixed("Independence Day", "08-15", ["IN"]),
  fixed("Gandhi Jayanti", "10-02", ["IN"]),
  fixed("Independence Day", "10-01", ["NG"]),
  fixed("Democracy Day", "06-12", ["NG"]),
  fixed("Children's Day", "05-27", ["NG"]),
  fixed("Independence Day", "03-06", ["GH"]),
  fixed("Republic Day", "07-01", ["GH"]),
  fixed("Madaraka Day", "06-01", ["KE"]),
  fixed("Mashujaa Day", "10-20", ["KE"]),
  fixed("Jamhuri Day", "12-12", ["KE"]),
  fixed("Human Rights Day", "03-21", ["ZA"]),
  fixed("Freedom Day", "04-27", ["ZA"]),
  fixed("Youth Day", "06-16", ["ZA"]),
  fixed("Women's Day", "08-09", ["ZA"]),
  fixed("Heritage Day", "09-24", ["ZA"]),
  fixed("Day of Reconciliation", "12-16", ["ZA"]),
  fixed("German Unity Day", "10-03", ["DE"]),
  { name: "Oktoberfest begins", countries: ["DE"], when: { 2026: "2026-09-19", 2027: "2027-09-18" } },
  fixed("Bastille Day", "07-14", ["FR"]),
  { name: "Carnival", countries: ["BR"], when: { 2026: "2026-02-17", 2027: "2027-02-09" } },
  fixed("Independence Day", "09-07", ["BR"]),
  fixed("Independence Day", "09-16", ["MX"]),
  fixed("Día de Muertos", "11-02", ["MX"]),
  { name: "Coming of Age Day", countries: ["JP"], when: { 2026: "2026-01-12", 2027: "2027-01-11" } },
  fixed("Showa Day", "04-29", ["JP"]),
  fixed("Children's Day", "05-05", ["JP"]),
  { name: "Respect for the Aged Day", countries: ["JP"], when: { 2026: "2026-09-21", 2027: "2027-09-20" } },
  fixed("National Day", "10-01", ["CN"]),
  { name: "Mid-Autumn Festival", countries: ["CN"], when: { 2026: "2026-09-25", 2027: "2027-09-15" } },
  fixed("Independence Day", "06-12", ["PH"]),
  fixed("Christmas season begins", "09-01", ["PH"]),
  fixed("All Saints' Day", "11-01", ["PH"]),
  fixed("National Day", "12-02", ["AE"]),
  { name: "World Cup begins", countries: FOOTBALL, when: { 2026: "2026-06-11" } },
  { name: "World Cup final", countries: FOOTBALL, when: { 2026: "2026-07-19" } },
];

export type WeekSlot = {
  week: number;
  start: string;
  end: string;
  holidays: string[];
};

function iso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function countryName(id: CountryId): string {
  return COUNTRIES.find((country) => country.id === id)?.name ?? id;
}

export function isCountryId(value: string): value is CountryId {
  return COUNTRIES.some((country) => country.id === value);
}

export function isPlanYear(value: number): value is PlanYear {
  return value === 2026 || value === 2027;
}

export function yearWeeks(year: PlanYear, country: CountryId): WeekSlot[] {
  const jan1 = Date.UTC(year, 0, 1);
  const weekday = new Date(jan1).getUTCDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  let cursor = jan1 - back * 86_400_000;
  const last = Date.UTC(year, 11, 31);
  const weeks: WeekSlot[] = [];
  let week = 1;
  while (cursor <= last) {
    const start = iso(cursor);
    const end = iso(cursor + 6 * 86_400_000);
    const holidays = HOLIDAYS.flatMap((holiday) => {
      const date = holiday.when[year];
      if (!date || date < start || date > end) return [];
      if (country !== "global" && !holiday.countries.includes(country)) return [];
      return [holiday.name];
    });
    weeks.push({ week, start, end, holidays });
    week += 1;
    cursor += 7 * 86_400_000;
  }
  return weeks;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekLabel(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const left = `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]}`;
  const right = `${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${s.getUTCDate()}–${e.getUTCDate()} ${MONTHS[s.getUTCMonth()]}`;
  return `${left} – ${right}`;
}

export function weekMonths(start: string, end: string): number[] {
  const s = new Date(`${start}T00:00:00Z`).getUTCMonth();
  const e = new Date(`${end}T00:00:00Z`).getUTCMonth();
  return s === e ? [s] : [s, e];
}
