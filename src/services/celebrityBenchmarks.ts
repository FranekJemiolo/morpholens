import type { NormalizedLandmark } from "../types/vision.ts";

export type PhysiqueCategory =
  | "Strongman & Heavyweight"
  | "Hyper-Muscular Bodybuilder"
  | "Athletic Mesomorph"
  | "Slender & Ectomorph"
  | "Petite & Compact";

export type Somatotype =
  "ectomorph" | "mesomorph" | "endomorph" | "hyper-muscular";

export interface CelebrityBenchmark {
  id: string;
  name: string;
  category: PhysiqueCategory;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  bmi: number;
  bodyFatPercentEstimate: number;
  somatotype: Somatotype;
  archetype: string;
  bio: string;
  achievements: string;
  proportions: {
    shoulderSpanRatio: number; // biacromial / stature (e.g. 0.21 - 0.30)
    hipSpanRatio: number; // bi-iliac / stature (e.g. 0.17 - 0.25)
    torsoRatio: number; // torso length / stature (e.g. 0.28 - 0.34)
    armSpanRatio: number; // wingspan / stature (e.g. 1.00 - 1.08)
    chestDepthRatio: number; // sagittal chest / shoulder span (e.g. 0.55 - 0.72)
  };
}

export const CELEBRITY_BENCHMARKS: CelebrityBenchmark[] = [
  // --- 1. Strongman & Heavyweight (Extreme High Mass) ---
  {
    id: "eddie-hall",
    name: "Eddie Hall",
    category: "Strongman & Heavyweight",
    gender: "male",
    heightCm: 190,
    weightKg: 160,
    bmi: 44.3,
    bodyFatPercentEstimate: 24.0,
    somatotype: "endomorph",
    archetype: "World Strongest Man Heavyweight Extreme",
    bio: "2017 World's Strongest Man winner and deadlift world record holder, featuring one of the thickest torso and pelvic circumferences ever recorded in modern athletic history.",
    achievements: "500kg deadlift record, 2017 WSM Champion",
    proportions: {
      shoulderSpanRatio: 0.272,
      hipSpanRatio: 0.212,
      torsoRatio: 0.318,
      armSpanRatio: 1.05,
      chestDepthRatio: 0.68,
    },
  },
  {
    id: "hafthor-bjornsson",
    name: "Hafthor Björnsson",
    category: "Strongman & Heavyweight",
    gender: "male",
    heightCm: 206,
    weightKg: 155,
    bmi: 36.5,
    bodyFatPercentEstimate: 18.0,
    somatotype: "hyper-muscular",
    archetype: "Tall Strongman Extreme Colossus",
    bio: "Iconic Icelandic strongman ('The Mountain') and 2018 WSM winner. Combines massive 206 cm stature with dense muscular bone thickness.",
    achievements:
      "501kg deadlift world record, Arnold Strongman Classic 3x Champion",
    proportions: {
      shoulderSpanRatio: 0.252,
      hipSpanRatio: 0.194,
      torsoRatio: 0.31,
      armSpanRatio: 1.06,
      chestDepthRatio: 0.64,
    },
  },
  {
    id: "shaquille-oneal",
    name: "Shaquille O'Neal",
    category: "Strongman & Heavyweight",
    gender: "male",
    heightCm: 216,
    weightKg: 147,
    bmi: 31.5,
    bodyFatPercentEstimate: 19.0,
    somatotype: "hyper-muscular",
    archetype: "Colossal Basketball Center",
    bio: "One of the most physically dominant NBA centers of all time. Extraordinary stature paired with massive bone density and wingspan.",
    achievements: "4x NBA Champion, 3x NBA Finals MVP, Hall of Fame",
    proportions: {
      shoulderSpanRatio: 0.234,
      hipSpanRatio: 0.174,
      torsoRatio: 0.302,
      armSpanRatio: 1.07,
      chestDepthRatio: 0.6,
    },
  },
  {
    id: "tyson-fury",
    name: "Tyson Fury",
    category: "Strongman & Heavyweight",
    gender: "male",
    heightCm: 206,
    weightKg: 126,
    bmi: 29.7,
    bodyFatPercentEstimate: 21.0,
    somatotype: "endomorph",
    archetype: "Heavyweight Boxing Champion",
    bio: "Two-time world heavyweight boxing champion with 216 cm wingspan and resilient heavyweight frame.",
    achievements: "Lineal & WBC Heavyweight Champion",
    proportions: {
      shoulderSpanRatio: 0.232,
      hipSpanRatio: 0.174,
      torsoRatio: 0.302,
      armSpanRatio: 1.08,
      chestDepthRatio: 0.6,
    },
  },

  // --- 2. Hyper-Muscular Bodybuilders ---
  {
    id: "arnold-schwarzenegger",
    name: "Arnold Schwarzenegger",
    category: "Hyper-Muscular Bodybuilder",
    gender: "male",
    heightCm: 188,
    weightKg: 107,
    bmi: 30.3,
    bodyFatPercentEstimate: 8.5,
    somatotype: "hyper-muscular",
    archetype: "Golden Era Bodybuilding V-Taper",
    bio: "7-time Mr. Olympia winner renowned for the greatest chest, back width, and biacromial V-taper in bodybuilding history.",
    achievements: "7x Mr. Olympia, Governor of California",
    proportions: {
      shoulderSpanRatio: 0.252,
      hipSpanRatio: 0.174,
      torsoRatio: 0.306,
      armSpanRatio: 1.03,
      chestDepthRatio: 0.65,
    },
  },
  {
    id: "the-rock",
    name: "Dwayne Johnson",
    category: "Hyper-Muscular Bodybuilder",
    gender: "male",
    heightCm: 196,
    weightKg: 118,
    bmi: 30.7,
    bodyFatPercentEstimate: 11.0,
    somatotype: "hyper-muscular",
    archetype: "Massive Action Hero Build",
    bio: "Former collegiate football player, WWE champion, and international film icon possessing an immense muscular frame and broad shoulder breadth.",
    achievements: "10x WWE World Champion, Hollywood superstar",
    proportions: {
      shoulderSpanRatio: 0.252,
      hipSpanRatio: 0.178,
      torsoRatio: 0.306,
      armSpanRatio: 1.04,
      chestDepthRatio: 0.64,
    },
  },

  // --- 3. Athletic Mesomorphs (Men & Women) ---
  {
    id: "cristiano-ronaldo",
    name: "Cristiano Ronaldo",
    category: "Athletic Mesomorph",
    gender: "male",
    heightCm: 187,
    weightKg: 83,
    bmi: 23.7,
    bodyFatPercentEstimate: 7.0,
    somatotype: "mesomorph",
    archetype: "Peak Lean Athletic Mesomorph",
    bio: "Global football superstar renowned for meticulous conditioning, explosive power, and razor-sharp lean muscular definition.",
    achievements: "5x Ballon d'Or, 5x Champions League Champion",
    proportions: {
      shoulderSpanRatio: 0.23,
      hipSpanRatio: 0.168,
      torsoRatio: 0.298,
      armSpanRatio: 1.02,
      chestDepthRatio: 0.59,
    },
  },
  {
    id: "usain-bolt",
    name: "Usain Bolt",
    category: "Athletic Mesomorph",
    gender: "male",
    heightCm: 195,
    weightKg: 94,
    bmi: 24.7,
    bodyFatPercentEstimate: 8.5,
    somatotype: "mesomorph",
    archetype: "Explosive Sprinter Build",
    bio: "Fastest human in history, featuring long fast-twitch lower extremities, broad shoulders, and efficient allometric biomechanics.",
    achievements: "8x Olympic Gold Medalist, 100m (9.58s) & 200m World Records",
    proportions: {
      shoulderSpanRatio: 0.234,
      hipSpanRatio: 0.168,
      torsoRatio: 0.288,
      armSpanRatio: 1.05,
      chestDepthRatio: 0.6,
    },
  },
  {
    id: "michael-phelps",
    name: "Michael Phelps",
    category: "Athletic Mesomorph",
    gender: "male",
    heightCm: 193,
    weightKg: 88,
    bmi: 23.6,
    bodyFatPercentEstimate: 7.5,
    somatotype: "mesomorph",
    archetype: "Aquatic Torso & Hyper-Wingspan",
    bio: "Most decorated Olympian of all time. Distinct anatomical profile characterized by an elongated torso and 201 cm wingspan.",
    achievements: "28 Olympic Medals (23 Gold)",
    proportions: {
      shoulderSpanRatio: 0.226,
      hipSpanRatio: 0.158,
      torsoRatio: 0.308,
      armSpanRatio: 1.07,
      chestDepthRatio: 0.58,
    },
  },
  {
    id: "serena-williams",
    name: "Serena Williams",
    category: "Athletic Mesomorph",
    gender: "female",
    heightCm: 175,
    weightKg: 72,
    bmi: 23.5,
    bodyFatPercentEstimate: 18.0,
    somatotype: "mesomorph",
    archetype: "Powerful Female Athletic Champion",
    bio: "23-time Grand Slam tennis champion exhibiting elite power, robust muscularity, and athletic gynoid biomechanics.",
    achievements: "23 Grand Slam Singles Titles, 4 Olympic Gold Medals",
    proportions: {
      shoulderSpanRatio: 0.212,
      hipSpanRatio: 0.182,
      torsoRatio: 0.298,
      armSpanRatio: 1.02,
      chestDepthRatio: 0.56,
    },
  },
  {
    id: "conor-mcgregor",
    name: "Conor McGregor",
    category: "Athletic Mesomorph",
    gender: "male",
    heightCm: 175,
    weightKg: 77,
    bmi: 25.1,
    bodyFatPercentEstimate: 10.0,
    somatotype: "mesomorph",
    archetype: "Combat Athlete Welterweight",
    bio: "First simultaneous two-division UFC champion with long reach (188 cm) relative to height and explosive fast-twitch musculature.",
    achievements: "UFC Featherweight & Lightweight Double Champion",
    proportions: {
      shoulderSpanRatio: 0.238,
      hipSpanRatio: 0.17,
      torsoRatio: 0.298,
      armSpanRatio: 1.06,
      chestDepthRatio: 0.6,
    },
  },
  {
    id: "ronda-rousey",
    name: "Ronda Rousey",
    category: "Athletic Mesomorph",
    gender: "female",
    heightCm: 170,
    weightKg: 66,
    bmi: 22.8,
    bodyFatPercentEstimate: 19.5,
    somatotype: "mesomorph",
    archetype: "Judo & MMA Combat Athlete",
    bio: "Olympic Judo medalist and UFC Hall of Famer known for dense upper body power and martial arts core strength.",
    achievements:
      "Olympic Bronze Medalist, Inaugural UFC Women's Bantamweight Champion",
    proportions: {
      shoulderSpanRatio: 0.21,
      hipSpanRatio: 0.18,
      torsoRatio: 0.298,
      armSpanRatio: 1.01,
      chestDepthRatio: 0.56,
    },
  },
  {
    id: "bruce-lee",
    name: "Bruce Lee",
    category: "Athletic Mesomorph",
    gender: "male",
    heightCm: 171,
    weightKg: 62,
    bmi: 21.2,
    bodyFatPercentEstimate: 6.0,
    somatotype: "mesomorph",
    archetype: "Ultra-Lean Functional Martial Artist",
    bio: "Legendary martial arts master and founder of Jeet Kune Do. Celebrated for iconic lats-spread V-taper and minimal body fat.",
    achievements: "Founder of Jeet Kune Do, Global martial arts icon",
    proportions: {
      shoulderSpanRatio: 0.232,
      hipSpanRatio: 0.162,
      torsoRatio: 0.295,
      armSpanRatio: 1.03,
      chestDepthRatio: 0.58,
    },
  },

  // --- 4. Slender & Ectomorph Profiles ---
  {
    id: "timothee-chalamet",
    name: "Timothée Chalamet",
    category: "Slender & Ectomorph",
    gender: "male",
    heightCm: 178,
    weightKg: 65,
    bmi: 20.5,
    bodyFatPercentEstimate: 11.5,
    somatotype: "ectomorph",
    archetype: "Slender Ectomorph Male",
    bio: "Acclaimed actor possessing a classic ectomorph frame: narrow bone structure, lean limbs, and modest cross-sectional torso depth.",
    achievements: "Oscar-nominated lead in Dune and Call Me by Your Name",
    proportions: {
      shoulderSpanRatio: 0.215,
      hipSpanRatio: 0.162,
      torsoRatio: 0.294,
      armSpanRatio: 1.0,
      chestDepthRatio: 0.55,
    },
  },
  {
    id: "gal-gadot",
    name: "Gal Gadot",
    category: "Slender & Ectomorph",
    gender: "female",
    heightCm: 178,
    weightKg: 58,
    bmi: 18.3,
    bodyFatPercentEstimate: 17.5,
    somatotype: "ectomorph",
    archetype: "Tall Slender Athletic Female",
    bio: "Action star and former model with tall, graceful stature, long extremities, and slender lean frame.",
    achievements: "Lead star of Wonder Woman franchise, Miss Israel",
    proportions: {
      shoulderSpanRatio: 0.188,
      hipSpanRatio: 0.164,
      torsoRatio: 0.284,
      armSpanRatio: 1.01,
      chestDepthRatio: 0.52,
    },
  },
  {
    id: "taylor-swift",
    name: "Taylor Swift",
    category: "Slender & Ectomorph",
    gender: "female",
    heightCm: 180,
    weightKg: 63,
    bmi: 19.4,
    bodyFatPercentEstimate: 19.0,
    somatotype: "ectomorph",
    archetype: "Tall Slender Ectomorph Frame",
    bio: "Global musical phenomenon with tall, statuesque stature, elongated leg proportions, and naturally slender allometrics.",
    achievements: "14 Grammy Awards, Historic global Eras Tour",
    proportions: {
      shoulderSpanRatio: 0.194,
      hipSpanRatio: 0.168,
      torsoRatio: 0.286,
      armSpanRatio: 1.01,
      chestDepthRatio: 0.53,
    },
  },
  {
    id: "margot-robbie",
    name: "Margot Robbie",
    category: "Slender & Ectomorph",
    gender: "female",
    heightCm: 168,
    weightKg: 57,
    bmi: 20.2,
    bodyFatPercentEstimate: 19.8,
    somatotype: "ectomorph",
    archetype: "Balanced Slender-Athletic Female",
    bio: "Academy Award-nominated actor and producer characterized by balanced, harmonious athletic-slender proportions.",
    achievements: "Star & Producer of Barbie, Multiple Oscar nominations",
    proportions: {
      shoulderSpanRatio: 0.198,
      hipSpanRatio: 0.172,
      torsoRatio: 0.29,
      armSpanRatio: 1.0,
      chestDepthRatio: 0.53,
    },
  },

  // --- 5. Petite & Compact Figures ---
  {
    id: "simone-biles",
    name: "Simone Biles",
    category: "Petite & Compact",
    gender: "female",
    heightCm: 142,
    weightKg: 47,
    bmi: 23.3,
    bodyFatPercentEstimate: 15.0,
    somatotype: "hyper-muscular",
    archetype: "Extreme Petite Muscular Gymnast",
    bio: "Most decorated gymnast in world history. Demonstrates high muscle mass density on a compact 142 cm stature with broad power shoulders.",
    achievements: "11 Olympic Medals (7 Gold), 30 World Championship Medals",
    proportions: {
      shoulderSpanRatio: 0.224,
      hipSpanRatio: 0.19,
      torsoRatio: 0.304,
      armSpanRatio: 1.03,
      chestDepthRatio: 0.58,
    },
  },
  {
    id: "kevin-hart",
    name: "Kevin Hart",
    category: "Petite & Compact",
    gender: "male",
    heightCm: 158,
    weightKg: 64,
    bmi: 25.6,
    bodyFatPercentEstimate: 13.5,
    somatotype: "mesomorph",
    archetype: "Compact Muscular Male",
    bio: "Actor and comedian known for rigorous fitness regimen, compact frame, muscular upper body, and dedication to marathon training.",
    achievements: "Global box office record-holder and fitness entrepreneur",
    proportions: {
      shoulderSpanRatio: 0.242,
      hipSpanRatio: 0.176,
      torsoRatio: 0.304,
      armSpanRatio: 1.01,
      chestDepthRatio: 0.62,
    },
  },
  {
    id: "kim-kardashian",
    name: "Kim Kardashian",
    category: "Petite & Compact",
    gender: "female",
    heightCm: 157,
    weightKg: 53,
    bmi: 21.5,
    bodyFatPercentEstimate: 21.5,
    somatotype: "endomorph",
    archetype: "Pronounced Hourglass Gynoid Profile",
    bio: "Global cultural entrepreneur exhibiting pronounced gynoid pelvic and hip width relative to a petite 157 cm height.",
    achievements: "SKIMS founder, global media and fashion pioneer",
    proportions: {
      shoulderSpanRatio: 0.198,
      hipSpanRatio: 0.192,
      torsoRatio: 0.298,
      armSpanRatio: 1.0,
      chestDepthRatio: 0.55,
    },
  },
];

/**
 * Synthesizes a high-fidelity 33-point NormalizedLandmark array matching the exact
 * anthropometric proportions of the given celebrity benchmark.
 */
export function generateCelebrityLandmarks(
  benchmark: CelebrityBenchmark,
  canvasWidth = 640,
  canvasHeight = 480,
): NormalizedLandmark[] {
  const p = benchmark.proportions;

  // Aspect ratio correction (mapping isotropic physical ratios to normalized coordinates)
  const aspectCorrection = canvasHeight / canvasWidth;

  // Stature in frame: center vertically with comfortable headroom
  const headApexY = 0.1;
  const feetFloorY = 0.9;
  const heightSpan = feetFloorY - headApexY; // 0.80

  // Head and neck points
  const noseY = headApexY + heightSpan * 0.055;
  const earY = headApexY + heightSpan * 0.052;
  const earDx = 0.035 * (p.shoulderSpanRatio / 0.24) * aspectCorrection;

  // Shoulders
  const shoulderY = headApexY + heightSpan * 0.165;
  const halfShoulderSpan =
    (p.shoulderSpanRatio * heightSpan * aspectCorrection) / 2;
  const lShoulderX = 0.5 - halfShoulderSpan;
  const rShoulderX = 0.5 + halfShoulderSpan;

  // Hips
  const torsoY = shoulderY + heightSpan * p.torsoRatio;
  const halfHipSpan = (p.hipSpanRatio * heightSpan * aspectCorrection) / 2;
  const lHipX = 0.5 - halfHipSpan;
  const rHipX = 0.5 + halfHipSpan;

  // Arms (proportional reach)
  const armLen = heightSpan * 0.44 * (p.armSpanRatio / 1.02);
  const elbowY = shoulderY + armLen * 0.46;
  const wristY = shoulderY + armLen * 0.92;
  const lElbowX = lShoulderX - 0.04 * aspectCorrection;
  const rElbowX = rShoulderX + 0.04 * aspectCorrection;
  const lWristX = lElbowX - 0.02 * aspectCorrection;
  const rWristX = rElbowX + 0.02 * aspectCorrection;

  // Legs
  const legLen = feetFloorY - torsoY;
  const kneeY = torsoY + legLen * 0.48;
  const ankleY = torsoY + legLen * 0.94;
  const heelY = feetFloorY;

  return Array.from({ length: 33 }, (_, idx) => {
    const base: NormalizedLandmark = { x: 0.5, y: 0.5, z: 0, visibility: 0.96 };

    switch (idx) {
      case 0: // Nose
        return { x: 0.5, y: noseY, z: -0.04, visibility: 0.99 };
      case 7: // Left ear
        return { x: 0.5 - earDx, y: earY, z: 0.01, visibility: 0.95 };
      case 8: // Right ear
        return { x: 0.5 + earDx, y: earY, z: 0.01, visibility: 0.95 };
      case 11: // Left shoulder
        return { x: lShoulderX, y: shoulderY, z: 0, visibility: 0.99 };
      case 12: // Right shoulder
        return { x: rShoulderX, y: shoulderY, z: 0, visibility: 0.99 };
      case 13: // Left elbow
        return { x: lElbowX, y: elbowY, z: 0.04, visibility: 0.95 };
      case 14: // Right elbow
        return { x: rElbowX, y: elbowY, z: 0.04, visibility: 0.95 };
      case 15: // Left wrist
        return { x: lWristX, y: wristY, z: 0.07, visibility: 0.95 };
      case 16: // Right wrist
        return { x: rWristX, y: wristY, z: 0.07, visibility: 0.95 };
      case 23: // Left hip
        return { x: lHipX, y: torsoY, z: 0, visibility: 0.98 };
      case 24: // Right hip
        return { x: rHipX, y: torsoY, z: 0, visibility: 0.98 };
      case 25: // Left knee
        return { x: lHipX + 0.005, y: kneeY, z: 0.02, visibility: 0.96 };
      case 26: // Right knee
        return { x: rHipX - 0.005, y: kneeY, z: 0.02, visibility: 0.96 };
      case 27: // Left ankle
        return { x: lHipX + 0.01, y: ankleY, z: 0, visibility: 0.98 };
      case 28: // Right ankle
        return { x: rHipX - 0.01, y: ankleY, z: 0, visibility: 0.98 };
      case 29: // Left heel
        return { x: lHipX + 0.01, y: heelY, z: -0.02, visibility: 0.95 };
      case 30: // Right heel
        return { x: rHipX - 0.01, y: heelY, z: -0.02, visibility: 0.95 };
      case 31: // Left toe
        return {
          x: lHipX + 0.012,
          y: heelY + 0.015,
          z: 0.05,
          visibility: 0.95,
        };
      case 32: // Right toe
        return {
          x: rHipX - 0.012,
          y: heelY + 0.015,
          z: 0.05,
          visibility: 0.95,
        };
      default:
        return base;
    }
  });
}
