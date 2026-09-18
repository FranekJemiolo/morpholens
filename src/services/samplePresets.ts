import type { SampleHumanPreset } from "../types/vision.ts";

export const SAMPLE_HUMANS: SampleHumanPreset[] = [
  {
    id: "male-front",
    name: "Male (Front)",
    gender: "male",
    orientation: "front",
    path: "samples/male-front.jpg",
    suggestedHeightCm: 182,
  },
  {
    id: "female-front",
    name: "Female (Front)",
    gender: "female",
    orientation: "front",
    path: "samples/female-front.jpg",
    suggestedHeightCm: 168,
  },
  {
    id: "male-side",
    name: "Profile (Side)",
    gender: "male",
    orientation: "side",
    path: "samples/male-side.jpg",
    suggestedHeightCm: 182,
  },
];
