// app/lib/camera-categories.ts

export type CameraCategoryOption = {
  label: string;
  value: string;
  href: string;
};

export type CameraCategorySection = {
  key: string;
  label: string;
  href: string;
  options: CameraCategoryOption[];
};

export type CameraBrandOption = {
  label: string;
  value: string;
  href: string;
};

export const CAMERA_CATEGORY_SECTIONS: CameraCategorySection[] = [
  {
    key: "cameras",
    label: "Cameras",
    href: "/current-listings?section=cameras",
    options: [
      { label: "Camera / general", value: "camera", href: "/current-listings?gear_type=camera" },
      { label: "Mirrorless cameras", value: "mirrorless_camera", href: "/current-listings?gear_type=mirrorless_camera" },
      { label: "DSLR cameras", value: "dslr_camera", href: "/current-listings?gear_type=dslr_camera" },
      { label: "Compact cameras", value: "compact_camera", href: "/current-listings?gear_type=compact_camera" },
      { label: "Film cameras", value: "film_camera", href: "/current-listings?gear_type=film_camera" },
      { label: "Medium format cameras", value: "medium_format_camera", href: "/current-listings?gear_type=medium_format_camera" },
      { label: "Rangefinder cameras", value: "rangefinder_camera", href: "/current-listings?gear_type=rangefinder_camera" },
      { label: "Instant cameras", value: "instant_camera", href: "/current-listings?gear_type=instant_camera" },
    ],
  },
  {
    key: "lenses",
    label: "Lenses",
    href: "/current-listings?section=lenses",
    options: [
      { label: "Lens / general", value: "lens", href: "/current-listings?gear_type=lens" },
      { label: "Mirrorless lenses", value: "mirrorless_lens", href: "/current-listings?gear_type=mirrorless_lens" },
      { label: "DSLR lenses", value: "dslr_lens", href: "/current-listings?gear_type=dslr_lens" },
      { label: "Cine lenses", value: "cine_lens", href: "/current-listings?gear_type=cine_lens" },
      { label: "Medium format lenses", value: "medium_format_lens", href: "/current-listings?gear_type=medium_format_lens" },
      { label: "Rangefinder lenses", value: "rangefinder_lens", href: "/current-listings?gear_type=rangefinder_lens" },
      { label: "Teleconverters", value: "teleconverter", href: "/current-listings?gear_type=teleconverter" },
      { label: "Lens adapters", value: "lens_adapter", href: "/current-listings?gear_type=lens_adapter" },
    ],
  },
  {
    key: "video",
    label: "Video",
    href: "/current-listings?section=video",
    options: [
      { label: "Cinema cameras", value: "cinema_camera", href: "/current-listings?gear_type=cinema_camera" },
      { label: "Camcorders", value: "camcorder", href: "/current-listings?gear_type=camcorder" },
      { label: "Action cameras", value: "action_camera", href: "/current-listings?gear_type=action_camera" },
      { label: "Drones", value: "drone", href: "/current-listings?gear_type=drone" },
      { label: "Gimbals", value: "gimbal", href: "/current-listings?gear_type=gimbal" },
      { label: "Field monitors", value: "field_monitor", href: "/current-listings?gear_type=field_monitor" },
      { label: "External recorders", value: "external_recorder", href: "/current-listings?gear_type=external_recorder" },
    ],
  },
  {
    key: "audio",
    label: "Audio",
    href: "/current-listings?section=audio",
    options: [
      { label: "On-camera microphones", value: "on_camera_microphone", href: "/current-listings?gear_type=on_camera_microphone" },
      { label: "Wireless microphones", value: "wireless_microphone", href: "/current-listings?gear_type=wireless_microphone" },
      { label: "Shotgun microphones", value: "shotgun_microphone", href: "/current-listings?gear_type=shotgun_microphone" },
      { label: "Audio recorders", value: "audio_recorder", href: "/current-listings?gear_type=audio_recorder" },
      { label: "Headphones", value: "headphones", href: "/current-listings?gear_type=headphones" },
    ],
  },
  {
    key: "lighting",
    label: "Lighting",
    href: "/current-listings?section=lighting",
    options: [
      { label: "Flashguns", value: "flashgun", href: "/current-listings?gear_type=flashgun" },
      { label: "Studio strobes", value: "studio_strobe", href: "/current-listings?gear_type=studio_strobe" },
      { label: "LED lights", value: "led_light", href: "/current-listings?gear_type=led_light" },
      { label: "Light modifiers", value: "light_modifier", href: "/current-listings?gear_type=light_modifier" },
      { label: "Triggers", value: "trigger", href: "/current-listings?gear_type=trigger" },
      { label: "Light meters", value: "light_meter", href: "/current-listings?gear_type=light_meter" },
    ],
  },
  {
    key: "support",
    label: "Support",
    href: "/current-listings?section=support",
    options: [
      { label: "Tripods", value: "tripod", href: "/current-listings?gear_type=tripod" },
      { label: "Monopods", value: "monopod", href: "/current-listings?gear_type=monopod" },
      { label: "Tripod heads", value: "tripod_head", href: "/current-listings?gear_type=tripod_head" },
      { label: "Sliders", value: "slider", href: "/current-listings?gear_type=slider" },
      { label: "Rigs & cages", value: "rig_cage", href: "/current-listings?gear_type=rig_cage" },
      { label: "Stabilisers", value: "stabiliser", href: "/current-listings?gear_type=stabiliser" },
    ],
  },
  {
    key: "accessories",
    label: "Accessories",
    href: "/current-listings?section=accessories",
    options: [
      { label: "Accessory / general", value: "accessory", href: "/current-listings?gear_type=accessory" },
      { label: "Bags & cases", value: "bag_case", href: "/current-listings?gear_type=bag_case" },
      { label: "Batteries", value: "battery", href: "/current-listings?gear_type=battery" },
      { label: "Chargers", value: "charger", href: "/current-listings?gear_type=charger" },
      { label: "Memory cards", value: "memory_card", href: "/current-listings?gear_type=memory_card" },
      { label: "Filters", value: "filter", href: "/current-listings?gear_type=filter" },
      { label: "Remote releases", value: "remote_release", href: "/current-listings?gear_type=remote_release" },
      { label: "Straps", value: "strap", href: "/current-listings?gear_type=strap" },
      { label: "Battery grips", value: "battery_grip", href: "/current-listings?gear_type=battery_grip" },
    ],
  },
  {
    key: "optics_specialist",
    label: "Optics & specialist",
    href: "/current-listings?section=optics_specialist",
    options: [
      { label: "Bundle", value: "bundle", href: "/current-listings?gear_type=bundle" },
      { label: "Binoculars", value: "binoculars", href: "/current-listings?gear_type=binoculars" },
      { label: "Spotting scopes", value: "spotting_scope", href: "/current-listings?gear_type=spotting_scope" },
      { label: "Telescopes", value: "telescope", href: "/current-listings?gear_type=telescope" },
      { label: "Darkroom equipment", value: "darkroom_equipment", href: "/current-listings?gear_type=darkroom_equipment" },
      { label: "Scanners", value: "scanner", href: "/current-listings?gear_type=scanner" },
      { label: "Collectable cameras", value: "collectable_camera", href: "/current-listings?gear_type=collectable_camera" },
      { label: "Other", value: "other", href: "/current-listings?gear_type=other" },
    ],
  },
];

export const CAMERA_BRANDS: CameraBrandOption[] = [
  "Canon",
  "Nikon",
  "Sony",
  "Fujifilm",
  "Panasonic",
  "Leica",
  "OM System",
  "Olympus",
  "Sigma",
  "Hasselblad",
  "Pentax",
  "DJI",
  "Tamron",
  "Tokina",
  "Zeiss",
  "Blackmagic Design",
  "GoPro",
  "RED",
].map((brand) => ({
  label: brand,
  value: brand,
  href: `/current-listings?brand=${encodeURIComponent(brand)}`,
}));

const CAMERA_BRANDS_BY_SECTION: Record<string, string[]> = {
  cameras: [
    "Canon",
    "Nikon",
    "Sony",
    "Fujifilm",
    "Panasonic",
    "Leica",
    "OM System",
    "Olympus",
    "Sigma",
    "Hasselblad",
    "Pentax",
    "Ricoh",
    "Contax",
    "Mamiya",
    "Minolta",
  ],
  lenses: [
    "Canon",
    "Nikon",
    "Sony",
    "Fujifilm",
    "Panasonic",
    "Leica",
    "Sigma",
    "Tamron",
    "Tokina",
    "Zeiss",
    "Voigtländer",
    "Samyang",
    "Laowa",
    "OM System",
    "Olympus",
    "Hasselblad",
    "Pentax",
  ],
  video: [
    "Sony",
    "Panasonic",
    "Canon",
    "Blackmagic Design",
    "RED",
    "DJI",
    "GoPro",
    "Nikon",
    "Fujifilm",
    "Z CAM",
  ],
  audio: [
    "RØDE",
    "Sennheiser",
    "Shure",
    "DJI",
    "Zoom",
    "Tascam",
    "Sony",
    "Hollyland",
    "Deity",
    "Audio-Technica",
  ],
  lighting: [
    "Godox",
    "Profoto",
    "Elinchrom",
    "Broncolor",
    "Neewer",
    "Aputure",
    "Nanlite",
    "Westcott",
    "Canon",
    "Nikon",
    "Sony",
  ],
  support: [
    "Manfrotto",
    "Benro",
    "Gitzo",
    "Peak Design",
    "SmallRig",
    "DJI",
    "Zhiyun",
    "Tilta",
    "Neewer",
    "Sachtler",
  ],
  accessories: [
    "Peak Design",
    "Lowepro",
    "Think Tank",
    "Billingham",
    "Tenba",
    "Hoya",
    "B+W",
    "Tiffen",
    "Lexar",
    "SanDisk",
    "SmallRig",
    "Canon",
    "Nikon",
    "Sony",
    "DJI",
  ],
  optics_specialist: [
    "Leica",
    "Zeiss",
    "Swarovski",
    "Celestron",
    "Sky-Watcher",
    "Nikon",
    "Canon",
    "Fujifilm",
    "Pentax",
    "Hasselblad",
    "Mamiya",
    "Voigtländer",
  ],
};

const LEGACY_GEAR_TYPE_LABELS: Record<string, string> = {
  camera: "Camera / general",
  lens: "Lens / general",
  film_camera: "Film cameras",
  bundle: "Bundle",
  accessory: "Accessory / general",
  other: "Other",
};

const LEGACY_SECTION_KEYS: Record<string, string> = {
  camera: "cameras",
  lens: "lenses",
  film_camera: "cameras",
  bundle: "optics_specialist",
  accessory: "accessories",
  other: "optics_specialist",
};

function titleCaseWords(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getBrandsForSection(sectionKey?: string | null) {
  const key = String(sectionKey || "").trim();
  if (!key) return CAMERA_BRANDS.map((brand) => brand.label);
  return CAMERA_BRANDS_BY_SECTION[key] || CAMERA_BRANDS.map((brand) => brand.label);
}

export function getCameraCategorySectionByKey(key?: string | null) {
  if (!key) return null;
  return CAMERA_CATEGORY_SECTIONS.find((section) => section.key === key) || null;
}

export function findCameraCategorySectionKey(gearType?: string | null) {
  const raw = String(gearType || "").trim();

  if (!raw) return "";

  for (const section of CAMERA_CATEGORY_SECTIONS) {
    if (section.options.some((option) => option.value === raw)) {
      return section.key;
    }
  }

  return LEGACY_SECTION_KEYS[raw] || "";
}

export function getGearTypeLabel(gearType?: string | null) {
  const raw = String(gearType || "").trim();

  if (!raw) return "";

  for (const section of CAMERA_CATEGORY_SECTIONS) {
    const found = section.options.find((option) => option.value === raw);
    if (found) return found.label;
  }

  if (LEGACY_GEAR_TYPE_LABELS[raw]) return LEGACY_GEAR_TYPE_LABELS[raw];

  return titleCaseWords(raw);
}