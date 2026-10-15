export const equipmentCategories = [
  "AMP",
  "GUITAR",
  "BASS",
  "MIC",
  "MIXER",
  "KEYBOARD",
  "DRUM",
  "OTHER",
] as const;

export type EquipmentCategory = (typeof equipmentCategories)[number];

export const equipmentCategoryLabel: Record<EquipmentCategory, string> = {
  AMP: "Amp",
  BASS: "Bass",
  DRUM: "Drum",
  GUITAR: "Guitar",
  KEYBOARD: "Keyboard",
  MIC: "Mic",
  MIXER: "Mixer",
  OTHER: "อื่น ๆ",
};
