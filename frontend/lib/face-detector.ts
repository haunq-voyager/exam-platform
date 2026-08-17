import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let sharedDetectorPromise: Promise<FaceDetector> | null = null;

function getSharedFaceDetector(): Promise<FaceDetector> {
  if (!sharedDetectorPromise) {
    sharedDetectorPromise = FilesetResolver.forVisionTasks(WASM_BASE_URL).then((vision) =>
      FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: "GPU" },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      })
    );
  }
  return sharedDetectorPromise;
}

export type FaceCountResult = "no_face" | "multiple_faces" | "ok";

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
    return "ok";
  }

  return { detectFaceCount };
}
