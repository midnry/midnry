// Inside buildings: which places you can walk into, and how each kind of room
// is furnished. Rooms are 640 × 440 room pixels: a back wall along the top,
// the floor below, and the door in the middle of the bottom wall.

export type RoomType =
  | "home_poor"
  | "home_middle"
  | "bedroom_poor"
  | "bedroom_middle"
  | "bathroom_poor"
  | "bathroom_middle"
  | "mansion"
  | "office"
  | "bank"
  | "bank_hr"
  | "bank_training"
  | "bank_work"
  | "bank_manager"
  | "clinic"
  | "shop"
  | "classroom"
  | "dorm"
  | "hall";

export const ROOM = { w: 640, h: 440, wall: 112, door: { x: 320, y: 418 } };

export type RoomItem = { id: string; x: number; y: number; accent?: string };

export type RoomAction = "phone" | "laptop" | "freshen" | "kitchen" | "vacancies" | "hr" | "training" | "workstation" | "manager";

export type RoomLayout = {
  wall: string;
  floor: "wood" | "tile" | "carpet" | "concrete";
  items: RoomItem[];
  /** Where you use the room (the desk, counter or bed): opens the place's actions. */
  use?: { x: number; y: number; label: string };
  /** Doors in the back wall to other rooms of the same home. */
  doors?: { x: number; label: string; to: RoomType }[];
  /** Things to do on the spot: check your phone, use the laptop, wash. */
  spots?: { x: number; y: number; label: string; action: RoomAction }[];
  /** Where the people who work here stand. */
  staff: { x: number; y: number }[];
};

export const LAYOUTS: Record<RoomType, RoomLayout> = {
  // ── Homes: a living room with doors to a bedroom and a bathroom ──
  home_middle: {
    wall: "#f3e2c3",
    floor: "wood",
    items: [
      { id: "walldoor", x: 40, y: 6, accent: "#8a5a33" },
      { id: "walldoor", x: 130, y: 6, accent: "#8a5a33" },
      { id: "picture", x: 236, y: 30, accent: "#f97316" },
      { id: "window", x: 300, y: 18, accent: "#2e7d32" },
      { id: "tvstand_flat", x: 214, y: 92 },
      { id: "sink", x: 400, y: 104 },
      { id: "stove", x: 488, y: 112 },
      { id: "fridge", x: 562, y: 76 },
      { id: "rug_ankara", x: 214, y: 280, accent: "#16a34a" },
      { id: "sofa", x: 222, y: 236, accent: "#1f6fd1" },
      { id: "armchair", x: 60, y: 236 },
      { id: "dining", x: 440, y: 270 },
      { id: "monstera", x: 14, y: 330 },
      { id: "plant", x: 590, y: 352 },
    ],
    doors: [
      { x: 73, label: "Bedroom", to: "bedroom_middle" },
      { x: 163, label: "Bathroom", to: "bathroom_middle" },
    ],
    spots: [{ x: 488, y: 196, label: "🍳 Use the kitchen", action: "kitchen" }],
    staff: [{ x: 360, y: 350 }],
  },
  home_poor: {
    wall: "#d9cfbd",
    floor: "concrete",
    items: [
      { id: "walldoor", x: 40, y: 6, accent: "#7a6249" },
      { id: "walldoor", x: 130, y: 6, accent: "#7a6249" },
      { id: "window", x: 300, y: 18, accent: "#8a5a33" },
      { id: "crt_bench", x: 220, y: 96 },
      { id: "stove", x: 420, y: 112 },
      { id: "bucket", x: 492, y: 150 },
      { id: "broom", x: 540, y: 74 },
      { id: "milkstool", x: 574, y: 108 },
      { id: "rug_ankara", x: 214, y: 280, accent: "#c2410c" },
      { id: "bench", x: 30, y: 320, accent: "#7a6249" },
      { id: "basket_torn", x: 470, y: 320 },
      { id: "cinderplant", x: 570, y: 350 },
    ],
    doors: [
      { x: 73, label: "Bedroom", to: "bedroom_poor" },
      { x: 163, label: "Bathroom", to: "bathroom_poor" },
    ],
    spots: [{ x: 420, y: 196, label: "🍳 Use the kitchen", action: "kitchen" }],
    staff: [{ x: 360, y: 350 }],
  },
  bedroom_middle: {
    wall: "#efe3d3",
    floor: "wood",
    items: [
      { id: "window", x: 230, y: 18, accent: "#b45309" },
      { id: "picture", x: 340, y: 30, accent: "#16a34a" },
      { id: "bed_ankara", x: 24, y: 110, accent: "#c2410c" },
      { id: "nightstand_phone", x: 164, y: 130 },
      { id: "desk_laptop", x: 228, y: 150 },
      { id: "fan", x: 346, y: 98 },
      { id: "dresser", x: 404, y: 66 },
      { id: "wardrobe", x: 550, y: 76 },
      { id: "rug_ankara", x: 214, y: 290, accent: "#1e6fbf" },
      { id: "armchair", x: 470, y: 270 },
      { id: "monstera", x: 14, y: 330 },
    ],
    use: { x: 92, y: 238, label: "Your bed" },
    spots: [
      { x: 190, y: 238, label: "📱 Check your phone", action: "phone" },
      { x: 284, y: 262, label: "💻 Use your laptop", action: "laptop" },
    ],
    staff: [],
  },
  bedroom_poor: {
    wall: "#d6cbb8",
    floor: "concrete",
    items: [
      { id: "window", x: 250, y: 18, accent: "#8a5a33" },
      { id: "bed_single", x: 24, y: 116, accent: "#b45309" },
      { id: "milkstool", x: 144, y: 128 },
      { id: "wardrobe_old", x: 214, y: 70 },
      { id: "fan_rusty", x: 306, y: 96 },
      { id: "mirror_broken", x: 380, y: 92 },
      { id: "bucket", x: 460, y: 156 },
      { id: "broom", x: 512, y: 82 },
      { id: "basket_torn", x: 568, y: 140 },
      { id: "rug_ankara", x: 214, y: 300, accent: "#b45309" },
    ],
    use: { x: 80, y: 240, label: "Your bed" },
    spots: [{ x: 172, y: 240, label: "📱 Check your phone", action: "phone" }],
    staff: [],
  },
  bathroom_middle: {
    wall: "#e6f0f5",
    floor: "tile",
    items: [
      { id: "wallshelf", x: 330, y: 22, accent: "#2e7d32" },
      { id: "bathmirror", x: 222, y: 2 },
      { id: "shower", x: 20, y: 34 },
      { id: "toilet", x: 130, y: 100 },
      { id: "vanity", x: 210, y: 90 },
      { id: "bathtub", x: 310, y: 112 },
      { id: "washer", x: 480, y: 100 },
      { id: "heater", x: 574, y: 62 },
      { id: "towelrail", x: 572, y: 230, accent: "#2e7d32" },
      { id: "towelshelf", x: 20, y: 300, accent: "#2e7d32" },
      { id: "basket", x: 500, y: 336 },
      { id: "plant", x: 590, y: 352 },
    ],
    spots: [{ x: 68, y: 214, label: "🚿 Take a shower", action: "freshen" }],
    staff: [],
  },
  bathroom_poor: {
    wall: "#cfc6b3",
    floor: "concrete",
    items: [
      { id: "shower_poor", x: 20, y: 34 },
      { id: "toilet_poor", x: 132, y: 100 },
      { id: "washstand", x: 214, y: 104 },
      { id: "mirror_broken", x: 336, y: 92 },
      { id: "heater_rusty", x: 420, y: 62 },
      { id: "towelrail_poor", x: 494, y: 92 },
      { id: "washboard", x: 572, y: 112 },
      { id: "bowl", x: 110, y: 330 },
      { id: "bucket", x: 196, y: 316 },
      { id: "basket_torn", x: 480, y: 320 },
      { id: "cinderplant", x: 570, y: 350 },
    ],
    spots: [{ x: 68, y: 214, label: "🪣 Have a bucket bath", action: "freshen" }],
    staff: [],
  },
  mansion: {
    wall: "#fdf6e3",
    floor: "carpet",
    items: [
      { id: "window", x: 30, y: 18, accent: "#b91c1c" },
      { id: "picture", x: 150, y: 30, accent: "#eab308" },
      { id: "window", x: 270, y: 18, accent: "#b91c1c" },
      { id: "picture", x: 390, y: 30, accent: "#16a34a" },
      { id: "window", x: 500, y: 18, accent: "#b91c1c" },
      { id: "tv", x: 250, y: 96 },
      { id: "speaker", x: 194, y: 112 },
      { id: "speaker", x: 384, y: 112 },
      { id: "bookshelf", x: 30, y: 84 },
      { id: "bookshelf", x: 540, y: 84 },
      { id: "rug", x: 236, y: 280, accent: "#b91c1c" },
      { id: "sofa", x: 60, y: 290, accent: "#b91c1c" },
      { id: "sofa", x: 430, y: 290, accent: "#b91c1c" },
      { id: "plant", x: 140, y: 150 },
      { id: "plant", x: 470, y: 150 },
      { id: "balloons", x: 300, y: 196 },
    ],
    use: { x: 320, y: 270, label: "The parlour" },
    staff: [{ x: 230, y: 250 }, { x: 410, y: 250 }],
  },
  office: {
    wall: "#e6eef8",
    floor: "tile",
    items: [
      { id: "window", x: 30, y: 18, accent: "#1e3a8a" },
      { id: "whiteboard", x: 200, y: 22 },
      { id: "clock", x: 380, y: 34 },
      { id: "window", x: 440, y: 18, accent: "#1e3a8a" },
      { id: "filing", x: 540, y: 96 },
      { id: "cooler", x: 596, y: 104 },
      { id: "bookshelf", x: 20, y: 86 },
      { id: "desk", x: 110, y: 150 },
      { id: "desk", x: 265, y: 150 },
      { id: "desk", x: 420, y: 150 },
      { id: "chair", x: 140, y: 236, accent: "#1f2937" },
      { id: "chair", x: 295, y: 236, accent: "#1f2937" },
      { id: "chair", x: 450, y: 236, accent: "#1f2937" },
      { id: "plant", x: 20, y: 352 },
      { id: "plant", x: 594, y: 352 },
    ],
    use: { x: 320, y: 300, label: "Front desk" },
    staff: [{ x: 210, y: 300 }],
  },
  bank: {
    wall: "#e2e8f0",
    floor: "tile",
    items: [
      { id: "window", x: 30, y: 18, accent: "#1e3a8a" },
      { id: "clock", x: 300, y: 30 },
      { id: "picture", x: 380, y: 30, accent: "#16a34a" },
      { id: "window", x: 510, y: 18, accent: "#1e3a8a" },
      { id: "counter", x: 210, y: 120, accent: "#1e3a8a" },
      { id: "plant", x: 160, y: 140 },
      { id: "plant", x: 444, y: 140 },
      { id: "bench", x: 40, y: 320, accent: "#1f6fd1" },
      { id: "bench", x: 460, y: 320, accent: "#1f6fd1" },
      { id: "cooler", x: 590, y: 200 },
      { id: "walldoor", x: 40, y: 6, accent: "#1e3a8a" },
      { id: "walldoor", x: 130, y: 6, accent: "#1e3a8a" },
      { id: "walldoor", x: 440, y: 6, accent: "#1e3a8a" },
      { id: "walldoor", x: 530, y: 6, accent: "#1e3a8a" },
    ],
    use: { x: 320, y: 250, label: "The counter" },
    doors: [
      { x: 73, label: "HR desk", to: "bank_hr" },
      { x: 163, label: "Training room", to: "bank_training" },
      { x: 473, label: "Workstations", to: "bank_work" },
      { x: 563, label: "Manager's office", to: "bank_manager" },
    ],
    spots: [{ x: 320, y: 330, label: "📋 Vacancy board", action: "vacancies" }],
    staff: [{ x: 300, y: 120 }],
  },
  // ── Bankers' Row offices: each one opens the careers screen at its desk ──
  bank_hr: {
    wall: "#e0e7ff",
    floor: "carpet",
    items: [
      { id: "window", x: 30, y: 18, accent: "#3730a3" },
      { id: "picture", x: 230, y: 30, accent: "#16a34a" },
      { id: "clock", x: 330, y: 30 },
      { id: "filing", x: 470, y: 96 },
      { id: "filing", x: 530, y: 96 },
      { id: "desk", x: 240, y: 150 },
      { id: "chair", x: 270, y: 236, accent: "#3730a3" },
      { id: "bench", x: 40, y: 320, accent: "#3730a3" },
      { id: "plant", x: 594, y: 352 },
    ],
    spots: [{ x: 300, y: 300, label: "🗂️ HR desk: applications & interviews", action: "hr" }],
    staff: [{ x: 300, y: 130 }],
  },
  bank_training: {
    wall: "#ecfccb",
    floor: "tile",
    items: [
      { id: "blackboard", x: 180, y: 22 },
      { id: "window", x: 30, y: 18, accent: "#3f6212" },
      { id: "window", x: 510, y: 18, accent: "#3f6212" },
      { id: "schooldesk", x: 120, y: 190 },
      { id: "schooldesk", x: 270, y: 190 },
      { id: "schooldesk", x: 420, y: 190 },
      { id: "schooldesk", x: 120, y: 290 },
      { id: "schooldesk", x: 420, y: 290 },
      { id: "plant", x: 594, y: 352 },
    ],
    spots: [{ x: 320, y: 320, label: "🎓 Join a training session", action: "training" }],
    staff: [{ x: 320, y: 130 }],
  },
  bank_work: {
    wall: "#e2e8f0",
    floor: "tile",
    items: [
      { id: "window", x: 30, y: 18, accent: "#1e3a8a" },
      { id: "whiteboard", x: 200, y: 22 },
      { id: "clock", x: 400, y: 34 },
      { id: "filing", x: 540, y: 96 },
      { id: "desk_laptop", x: 110, y: 150 },
      { id: "desk_laptop", x: 265, y: 150 },
      { id: "desk_laptop", x: 420, y: 150 },
      { id: "chair", x: 140, y: 236, accent: "#1f2937" },
      { id: "chair", x: 450, y: 236, accent: "#1f2937" },
      { id: "plant", x: 20, y: 352 },
    ],
    spots: [{ x: 320, y: 300, label: "💻 Your workstation", action: "workstation" }],
    staff: [{ x: 170, y: 300 }, { x: 480, y: 300 }],
  },
  bank_manager: {
    wall: "#fef3c7",
    floor: "carpet",
    items: [
      { id: "window", x: 30, y: 18, accent: "#92400e" },
      { id: "picture", x: 250, y: 30, accent: "#b45309" },
      { id: "window", x: 510, y: 18, accent: "#92400e" },
      { id: "bookshelf", x: 30, y: 86 },
      { id: "desk", x: 260, y: 150 },
      { id: "chair", x: 290, y: 236, accent: "#78350f" },
      { id: "sofa", x: 430, y: 290, accent: "#78350f" },
      { id: "plant", x: 594, y: 352 },
    ],
    spots: [{ x: 320, y: 300, label: "📈 Reviews & promotion panel", action: "manager" }],
    staff: [{ x: 320, y: 130 }],
  },
  clinic: {
    wall: "#eef6f8",
    floor: "tile",
    items: [
      { id: "window", x: 30, y: 18, accent: "#0e7490" },
      { id: "clock", x: 270, y: 30 },
      { id: "window", x: 500, y: 18, accent: "#0e7490" },
      { id: "hospitalbed", x: 20, y: 130 },
      { id: "hospitalbed", x: 170, y: 130 },
      { id: "desk", x: 420, y: 150 },
      { id: "filing", x: 566, y: 96 },
      { id: "cooler", x: 360, y: 104 },
      { id: "bench", x: 40, y: 320, accent: "#0e7490" },
      { id: "plant", x: 594, y: 352 },
    ],
    use: { x: 470, y: 290, label: "Nurse's desk" },
    staff: [{ x: 540, y: 270 }],
  },
  shop: {
    wall: "#fff7ed",
    floor: "tile",
    items: [
      { id: "shelf", x: 20, y: 90 },
      { id: "shelf", x: 150, y: 90 },
      { id: "shelf", x: 360, y: 90 },
      { id: "fridge", x: 560, y: 80 },
      { id: "counter", x: 200, y: 260, accent: "#f97316" },
      { id: "plant", x: 594, y: 352 },
      { id: "balloons", x: 490, y: 96 },
    ],
    use: { x: 310, y: 380, label: "The till" },
    staff: [{ x: 300, y: 250 }],
  },
  classroom: {
    wall: "#fef3c7",
    floor: "wood",
    items: [
      { id: "window", x: 30, y: 18, accent: "#1e40af" },
      { id: "blackboard", x: 220, y: 16 },
      { id: "window", x: 510, y: 18, accent: "#1e40af" },
      { id: "teacherdesk", x: 268, y: 120 },
      { id: "bookshelf", x: 30, y: 96 },
      { id: "schooldesk", x: 100, y: 220 },
      { id: "schooldesk", x: 285, y: 220 },
      { id: "schooldesk", x: 470, y: 220 },
      { id: "schooldesk", x: 100, y: 320 },
      { id: "schooldesk", x: 285, y: 320 },
      { id: "schooldesk", x: 470, y: 320 },
    ],
    use: { x: 320, y: 210, label: "Teacher's desk" },
    staff: [{ x: 410, y: 170 }],
  },
  dorm: {
    wall: "#e0e7ff",
    floor: "wood",
    items: [
      { id: "window", x: 40, y: 18, accent: "#7b3fc4" },
      { id: "picture", x: 300, y: 30, accent: "#ef4444" },
      { id: "window", x: 460, y: 18, accent: "#7b3fc4" },
      { id: "bed", x: 20, y: 112, accent: "#7b3fc4" },
      { id: "bed", x: 170, y: 112, accent: "#16a34a" },
      { id: "wardrobe", x: 548, y: 76 },
      { id: "desk", x: 400, y: 150 },
      { id: "chair", x: 430, y: 236, accent: "#7b3fc4" },
      { id: "plant", x: 20, y: 352 },
    ],
    use: { x: 160, y: 240, label: "Your bunk" },
    staff: [{ x: 300, y: 320 }],
  },
  hall: {
    wall: "#fde68a",
    floor: "wood",
    items: [
      { id: "speaker", x: 30, y: 100 },
      { id: "speaker", x: 560, y: 100 },
      { id: "balloons", x: 110, y: 40 },
      { id: "balloons", x: 460, y: 40 },
      { id: "picture", x: 290, y: 30, accent: "#16a34a" },
      { id: "dining", x: 110, y: 200 },
      { id: "dining", x: 390, y: 200 },
      { id: "dining", x: 250, y: 316 },
      { id: "rug", x: 236, y: 120, accent: "#f97316" },
    ],
    use: { x: 320, y: 230, label: "The party" },
    staff: [{ x: 320, y: 160 }],
  },
};

const PLACE_ROOMS: Record<string, RoomType> = {
  home_nyanya: "home_poor",
  home_gwarinpa: "home_middle",
  tunde_place: "home_poor",
  bolaji_house: "mansion",
  okafor_office: "office",
  tech_hub: "office",
  cbd_tower: "office",
  ministry: "office",
  oil_hq: "office",
  visa_agent: "office",
  quickkash: "office",
  garki_hub: "office",
  slim_lab: "office",
  cbd_bank: "bank",
  hospital: "clinic",
  jabi_mall: "shop",
  asokoro_owambe: "hall",
  wuse_plaza: "office",
  telecom_office: "office",
  cac_office: "office",
  efcc_hq: "office",
  driving_school: "office",
  laundry_nyanya: "shop",
  laundry_gwarinpa: "shop",
};

/** The room behind a city place's door, if it has one (markets and parks are outdoors). */
export function roomForPlace(placeId: string): RoomType | null {
  return PLACE_ROOMS[placeId] ?? null;
}

/** The room inside a story-chapter building, from its name. Your own home matches how you grew up. */
export function roomForBuilding(label: string, background: "lapo" | "average" = "average"): RoomType | null {
  if (/neighbour/i.test(label)) return "home_poor";
  if (/home/i.test(label)) return background === "lapo" ? "home_poor" : "home_middle";
  if (/class|lecture|exam/i.test(label)) return "classroom";
  if (/headmaster|faculty|office|gate house/i.test(label)) return "office";
  if (/hostel/i.test(label)) return "dorm";
  if (/clinic/i.test(label)) return "clinic";
  if (/hall|mansion/i.test(label)) return "hall";
  if (/mama put|kiosk|suya|yam|depot/i.test(label)) return "shop";
  return null;
}

/** Where you are inside: the room, its name, the city place it belongs to, and the room you came from. */
export type RoomInfo = { type: RoomType; name: string; placeId?: string; parent?: RoomInfo };

/** Bathrooms and bedrooms of the poorer homes. */
export const isPoorRoom = (type: RoomType) => type.endsWith("_poor");
