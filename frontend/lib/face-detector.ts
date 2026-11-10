import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

// Both are served from our own origin: the WASM is copied from node_modules at build time
// (scripts/copy-mediapipe.mjs) so it always matches the installed JS API, and the model lives in public/.
const WASM_BASE_URL = "/mediapipe/wasm";
const MODEL_ASSET_PATH = "/mediapipe/blaze_face_short_range.tflite";

let sharedDetectorPromise: Promise<FaceDetector> | null = null;

async function createFaceDetector(): Promise<FaceDetector> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  const create = (delegate: "GPU" | "CPU") =>
    FaceDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
    });

  try {
    return await create("GPU");
  } catch {
    // GPU/WebGL delegate is unavailable on some machines; CPU is slower but works everywhere.
    return create("CPU");
  }
}

function getSharedFaceDetector(): Promise<FaceDetector> {
  if (!sharedDetectorPromise) {
    sharedDetectorPromise = createFaceDetector().catch((error) => {
      sharedDetectorPromise = null; // allow a retry instead of caching the failure
      throw error;
    });
  }
  return sharedDetectorPromise;
}

export type FaceCountResult = "no_face" | "multiple_faces" | "face_out_of_frame" | "ok";

/**
 * MediaPipe only reports the portion of a face it can actually see, so a
 * bounding box can never literally extend past the frame. As a proxy for
 * "rời khung hình", treat a face whose box touches/crosses a frame edge
 * (within this margin) as partially cut off by the camera boundary.
 */
const OUT_OF_FRAME_EDGE_MARGIN_RATIO = 0.03;

function isTouchingFrameEdge(
  box: { originX: number; originY: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number
): boolean {
  const marginX = frameWidth * OUT_OF_FRAME_EDGE_MARGIN_RATIO;
  const marginY = frameHeight * OUT_OF_FRAME_EDGE_MARGIN_RATIO;
  const left = box.originX;
  const top = box.originY;
  const right = frameWidth - (box.originX + box.width);
  const bottom = frameHeight - (box.originY + box.height);
  return left <= marginX || top <= marginY || right <= marginX || bottom <= marginY;
}

export async function createVideoFaceCounter(
  video: HTMLVideoElement
): Promise<{ detectFaceCount: () => FaceCountResult | null }> {
  const detector = await getSharedFaceDetector();

  function detectFaceCount(): FaceCountResult | null {
    if (video.readyState < 2 || video.videoWidth === 0) return null;
    const result = detector.detectForVideo(video, performance.now());
    const faceCount = result.detections.length;
    if (faceCount === 0) return "no_face";
    if (faceCount > 1) return "multiple_faces";

    const box = result.detections[0]?.boundingBox;
    if (box && isTouchingFrameEdge(box, video.videoWidth, video.videoHeight)) {
      return "face_out_of_frame";
    }
    return "ok";
  }

  return { detectFaceCount };
}
