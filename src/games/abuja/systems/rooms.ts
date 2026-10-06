// Inside buildings: which places you can walk into, and how each kind of room
// is furnished. Rooms are 640 × 440 room pixels: a back wall along the top,
// the floor below, and the door in the middle of the bottom wall.

export type RoomType = "home" | "mansion" | "office" | "bank" | "clinic" | "shop" | "classroom" | "dorm" | "hall";

export const ROOM = { w: 640, h: 440, wall: 112, door: { x: 320, y: 418 } };

export type RoomItem = { id: string; x: number; y: number; accent?: string };

export type RoomLayout = {
  wall: string;
  floor: "wood" | "tile" | "carpet";
  items: RoomItem[];
  /** Where you use the room (the desk, counter or bed): opens the place's actions. */
  use: { x: number; y: number; label: string };
  /** Where the people who work here stand. */
  staff: { x: number; y: number }[];
};

export const LAYOUTS: Record<RoomType, RoomLayout> = {
  home: {
    wall: "#f3e2c3",
    floor: "wood",
    items: [
      { id: "window", x: 40, y: 18, accent: "#2e7d32" },
      { id: "picture", x: 220, y: 34, accent: "#f97316" },
      { id: "clock", x: 300, y: 30 },
      { id: "window", x: 360, y: 18, accent: "#2e7d32" },
      { id: "bed", x: 24, y: 112, accent: "#1f6fd1" },
      { id: "nightstand", x: 160, y: 132 },
      { id: "tv", x: 230, y: 96 },
      { id: "sink", x: 400, y: 104 },
      { id: "stove", x: 488, y: 112 },
      { id: "fridge", x: 562, y: 76 },
      { id: "rug", x: 214, y: 270, accent: "#16a34a" },
      { id: "sofa", x: 222, y: 236, accent: "#1f6fd1" },
      { id: "dining", x: 440, y: 270 },
      { id: "plant", x: 18, y: 340 },
      { id: "plant", x: 590, y: 352 },
    ],
    use: { x: 90, y: 240, label: "Your room" },
    staff: [{ x: 360, y: 340 }],
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
    ],
    use: { x: 320, y: 250, label: "The counter" },
    staff: [{ x: 300, y: 120 }],
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
  home_nyanya: "home",
  home_gwarinpa: "home",
  tunde_place: "home",
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
};

/** The room behind a city place's door, if it has one (markets and parks are outdoors). */
export function roomForPlace(placeId: string): RoomType | null {
  return PLACE_ROOMS[placeId] ?? null;
}

/** The room inside a story-chapter building, from its name. */
export function roomForBuilding(label: string): RoomType | null {
  if (/home|neighbour/i.test(label)) return "home";
  if (/class|lecture|exam/i.test(label)) return "classroom";
  if (/headmaster|faculty|office|gate house/i.test(label)) return "office";
  if (/hostel/i.test(label)) return "dorm";
  if (/clinic/i.test(label)) return "clinic";
  if (/hall|mansion/i.test(label)) return "hall";
  if (/mama put|kiosk|suya|yam|depot/i.test(label)) return "shop";
  return null;
}

export type RoomInfo = { type: RoomType; name: string; placeId?: string };
