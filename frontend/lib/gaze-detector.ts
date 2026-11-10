import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_BASE_URL = "/mediapipe/wasm";
const MODEL_ASSET_PATH = "/mediapipe/face_landmarker.task";

/**
 * Thresholds for "not looking at the exam screen". A webcam cannot tell whether someone looks exactly at the lens,
 * and a student has to look at the screen (question text, answers) which is slightly off the lens, so only
 * clearly off-screen directions count: head turned away, or eyes pushed far to the side / up / down.
 * Tune here if it is too strict or too lenient.
 */
export const HEAD_YAW_LIMIT_DEG = 30;
export const HEAD_PITCH_LIMIT_DEG = 40;
export const EYE_HORIZONTAL_LIMIT = 0.55;
export const EYE_UP_LIMIT = 0.6;
export const EYE_DOWN_LIMIT = 0.7;
const EYES_CLOSED_LIMIT = 0.6;

export type GazeState = "ok" | "looking_away" | "eyes_closed";

export interface GazeReading {
  state: GazeState;
  /** Head rotation left/right in degrees (absolute). */
  yawDeg: number;
  /** Head rotation up/down in degrees (absolute). */
  pitchDeg: number;
  /** 0..1, how far both eyes look sideways. */
  eyeHorizontal: number;
  /** 0..1, how far both eyes look up / down. */
  eyeUp: number;
  eyeDown: number;
}

let sharedLandmarkerPromise: Promise<FaceLandmarker> | null = null;

async function createLandmarker(): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  const create = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });

  try {
    return await create("GPU");
  } catch {
    return create("CPU");
  }
}

function getSharedLandmarker(): Promise<FaceLandmarker> {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = createLandmarker().catch((error) => {
      sharedLandmarkerPromise = null;
      throw error;
    });
  }
  return sharedLandmarkerPromise;
}

const RAD_TO_DEG = 180 / Math.PI;

/** Head yaw/pitch (absolute degrees) from the 4x4 face transformation matrix; only magnitudes are used so the matrix layout does not matter. */
function headAnglesDeg(matrix: number[]): { yawDeg: number; pitchDeg: number } {
  const yaw = Math.atan2(matrix[8], matrix[10]) * RAD_TO_DEG;
  const pitch = Math.asin(Math.max(-1, Math.min(1, matrix[9]))) * RAD_TO_DEG;
  return { yawDeg: Math.abs(yaw), pitchDeg: Math.abs(pitch) };
}

export async function createVideoGazeMonitor(video: HTMLVideoElement): Promise<{ detectGaze: () => GazeReading | null }> {
  const landmarker = await getSharedLandmarker();

  function detectGaze(): GazeReading | null {
    if (video.readyState < 2 || video.videoWidth === 0) return null;
    const result = landmarker.detectForVideo(video, performance.now());
    const categories = result.faceBlendshapes?.[0]?.categories;
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    if (!categories || !matrix) return null; // no face this frame: presence is handled by the face detector

    const score = (name: string) => categories.find((category) => category.categoryName === name)?.score ?? 0;
    const lookingRight = (score("eyeLookInLeft") + score("eyeLookOutRight")) / 2;
    const lookingLeft = (score("eyeLookOutLeft") + score("eyeLookInRight")) / 2;
    const eyeHorizontal = Math.max(lookingRight, lookingLeft);
    const eyeUp = (score("eyeLookUpLeft") + score("eyeLookUpRight")) / 2;
    const eyeDown = (score("eyeLookDownLeft") + score("eyeLookDownRight")) / 2;
    const blink = (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2;
    const { yawDeg, pitchDeg } = headAnglesDeg(matrix);

    let state: GazeState = "ok";
    if (blink > EYES_CLOSED_LIMIT) {
      state = "eyes_closed"; // blinking / eyes shut: not enough information, do not accuse
    } else if (
      yawDeg > HEAD_YAW_LIMIT_DEG ||
      pitchDeg > HEAD_PITCH_LIMIT_DEG ||
      eyeHorizontal > EYE_HORIZONTAL_LIMIT ||
      eyeUp > EYE_UP_LIMIT ||
      eyeDown > EYE_DOWN_LIMIT
    ) {
      state = "looking_away";
    }

    return { state, yawDeg, pitchDeg, eyeHorizontal, eyeUp, eyeDown };
  }

  return { detectGaze };
}
