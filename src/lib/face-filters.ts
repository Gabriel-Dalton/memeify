"use client";

/**
 * Real face-detection filters using @vladmandic/face-api (a maintained fork
 * of the classic face-api.js). Models are loaded lazily from a public CDN
 * on first use so they don't bloat the build.
 *
 * Each filter is a set of emoji overlays anchored to detected face landmarks
 * (eyes, nose, mouth, chin, forehead). On an image with no face, we fall
 * back to a center-placed bundle so the filter still does something fun.
 */

// face-api.js is a large module; import lazily.
type FaceApiModule = typeof import("@vladmandic/face-api");
let faceApiPromise: Promise<FaceApiModule> | null = null;
let modelsReady = false;

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/";

async function loadFaceApi(): Promise<FaceApiModule> {
  if (!faceApiPromise) {
    faceApiPromise = import("@vladmandic/face-api");
  }
  const faceapi = await faceApiPromise;
  if (!modelsReady) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    modelsReady = true;
  }
  return faceapi;
}

export interface Point {
  x: number;
  y: number;
}
export interface FaceDetection {
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  leftEye: Point;
  rightEye: Point;
  noseTip: Point;
  mouthCenter: Point;
  chin: Point;
  foreheadTop: Point; // approx: above eyebrows
  leftEar: Point;
  rightEar: Point;
}

function avgPoints(pts: Point[]): Point {
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

export async function detectFaces(img: HTMLImageElement): Promise<FaceDetection[]> {
  const faceapi = await loadFaceApi();
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
    .withFaceLandmarks();

  return detections.map((d) => {
    const lm = d.landmarks;
    const leftEye = avgPoints(lm.getLeftEye());
    const rightEye = avgPoints(lm.getRightEye());
    const box = d.detection.box;
    return {
      boxX: box.x,
      boxY: box.y,
      boxW: box.width,
      boxH: box.height,
      leftEye,
      rightEye,
      noseTip: lm.getNose()[3],
      mouthCenter: avgPoints(lm.getMouth()),
      chin: lm.getJawOutline()[8],
      foreheadTop: {
        x: (leftEye.x + rightEye.x) / 2,
        y: box.y - box.height * 0.1,
      },
      leftEar: { x: box.x, y: (leftEye.y + rightEye.y) / 2 },
      rightEar: { x: box.x + box.width, y: (leftEye.y + rightEye.y) / 2 },
    };
  });
}

// Filter spec: a list of emoji placements relative to detected landmarks.
export type Anchor =
  | "forehead"
  | "leftEye"
  | "rightEye"
  | "eyesCenter"
  | "noseTip"
  | "mouthCenter"
  | "chin"
  | "leftEar"
  | "rightEar"
  | "faceCenter";

export interface FilterItem {
  emoji: string;
  anchor: Anchor;
  /** size in units of face width; 1.0 = face width */
  size: number;
  /** offset in face-width units (dx right, dy down) */
  dx?: number;
  dy?: number;
  rotate?: number; // degrees
}

export interface SnapFilter {
  id: string;
  label: string;
  emoji: string;
  items: FilterItem[];
}

export const SNAP_FILTERS: SnapFilter[] = [
  {
    id: "dog",
    label: "Dog",
    emoji: "🐶",
    items: [
      { emoji: "🐶", anchor: "forehead", size: 0.9, dy: -0.25 },
      { emoji: "👅", anchor: "mouthCenter", size: 0.35, dy: 0.2 },
    ],
  },
  {
    id: "crown",
    label: "Royalty",
    emoji: "👑",
    items: [{ emoji: "👑", anchor: "forehead", size: 0.75, dy: -0.2 }],
  },
  {
    id: "devil",
    label: "Devil",
    emoji: "😈",
    items: [
      { emoji: "😈", anchor: "forehead", size: 0.85, dy: -0.3 },
      { emoji: "💢", anchor: "leftEar", size: 0.3, dx: -0.1 },
      { emoji: "💢", anchor: "rightEar", size: 0.3, dx: 0.1 },
    ],
  },
  {
    id: "angel",
    label: "Angel",
    emoji: "😇",
    items: [
      { emoji: "😇", anchor: "forehead", size: 0.85, dy: -0.3 },
      { emoji: "✨", anchor: "leftEar", size: 0.25, dx: -0.15 },
      { emoji: "✨", anchor: "rightEar", size: 0.25, dx: 0.15 },
    ],
  },
  {
    id: "clown",
    label: "Clown",
    emoji: "🤡",
    items: [
      { emoji: "🔴", anchor: "noseTip", size: 0.18 },
      { emoji: "🤡", anchor: "forehead", size: 0.8, dy: -0.25 },
      { emoji: "⭐", anchor: "leftEye", size: 0.15, dx: -0.1, dy: 0.15 },
      { emoji: "⭐", anchor: "rightEye", size: 0.15, dx: 0.1, dy: 0.15 },
    ],
  },
  {
    id: "cool",
    label: "Cool Guy",
    emoji: "🕶️",
    items: [
      { emoji: "🕶️", anchor: "eyesCenter", size: 0.9 },
      { emoji: "🔥", anchor: "leftEar", size: 0.3, dx: -0.2 },
      { emoji: "🔥", anchor: "rightEar", size: 0.3, dx: 0.2 },
    ],
  },
  {
    id: "cat",
    label: "Cat",
    emoji: "🐱",
    items: [
      { emoji: "🐱", anchor: "forehead", size: 0.85, dy: -0.25 },
      { emoji: "〰️", anchor: "noseTip", size: 0.6, dy: 0.05, rotate: -10 },
      { emoji: "〰️", anchor: "noseTip", size: 0.6, dy: 0.05, rotate: 10 },
    ],
  },
  {
    id: "alien",
    label: "Alien",
    emoji: "👽",
    items: [{ emoji: "👽", anchor: "faceCenter", size: 1.1 }],
  },
  {
    id: "vampire",
    label: "Vampire",
    emoji: "🧛",
    items: [
      { emoji: "🧛", anchor: "forehead", size: 0.8, dy: -0.25 },
      { emoji: "🦷", anchor: "mouthCenter", size: 0.18, dx: -0.08, dy: 0.05 },
      { emoji: "🦷", anchor: "mouthCenter", size: 0.18, dx: 0.08, dy: 0.05 },
      { emoji: "🩸", anchor: "chin", size: 0.2, dy: 0.1 },
    ],
  },
  {
    id: "money",
    label: "Money",
    emoji: "🤑",
    items: [
      { emoji: "💵", anchor: "leftEye", size: 0.3 },
      { emoji: "💵", anchor: "rightEye", size: 0.3 },
      { emoji: "👑", anchor: "forehead", size: 0.6, dy: -0.2 },
    ],
  },
];

export function resolveAnchor(face: FaceDetection, anchor: Anchor): Point {
  switch (anchor) {
    case "forehead":
      return face.foreheadTop;
    case "leftEye":
      return face.leftEye;
    case "rightEye":
      return face.rightEye;
    case "eyesCenter":
      return {
        x: (face.leftEye.x + face.rightEye.x) / 2,
        y: (face.leftEye.y + face.rightEye.y) / 2,
      };
    case "noseTip":
      return face.noseTip;
    case "mouthCenter":
      return face.mouthCenter;
    case "chin":
      return face.chin;
    case "leftEar":
      return face.leftEar;
    case "rightEar":
      return face.rightEar;
    case "faceCenter":
      return { x: face.boxX + face.boxW / 2, y: face.boxY + face.boxH / 2 };
  }
}
