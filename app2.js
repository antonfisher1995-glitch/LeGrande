let detector, llm;

window.addEventListener("DOMContentLoaded", async () => {
  await tf.setBackend("webgl");
  await tf.ready();

  try {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    console.log("✅ Pose detector initialized");
  } catch (e) {
    console.error("❌ Detector initialization failed:", e);
  }

  try {
    llm = await window.webllm.createWebWorkerEngine({
      model: "TinyLlama-1.1B-Chat-v1.0-q4f16_1"
    });
    console.log("🧠 WebLLM model loading...");
  } catch (e) {
    console.error("❌ WebLLM init failed:", e);
  }

  // UI actions
  document.getElementById("analyzeBtn").onclick = analyzeVideo;
  document.getElementById("videoInput").onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const vid = document.getElementById("video");
      vid.src = url;
      vid.load();
      vid.muted = true;
      vid.playsInline = true;
      vid.controls = true;
      document.getElementById("metricsOutput").textContent =
        "✅ Video loaded: " + file.name + " — press Play, then click Analyze.";
    }
  };
  document.getElementById("downloadLogs").onclick = downloadLogs;
});

async function analyzeVideo() {
  const video = document.getElementById("video");
  if (!video.src) return alert("Please select a video first.");

  // Check playback state
  if (video.paused || video.ended) {
    alert("Press Play on the video first, then click Analyze again.");
    return;
  }

  document.getElementById("metricsOutput").textContent = "Running pose detection...";
  let poses = [];

  try {
    // Wait one frame to make sure we get a fresh image
    await tf.nextFrame();
    poses = await detector.estimatePoses(video, { flipHorizontal: false });
    console.log("🎯 Detected poses:", poses);
  } catch (e) {
    console.error("❌ Pose detection failed:", e);
  }

  if (!poses.length || !poses[0].keypoints?.length) {
    document.getElementById("metricsOutput").textContent =
      "⚠️ No pose detected. Try a brighter or closer video.";
    return;
  }

  const kp = poses[0].keypoints;
  const metrics = computeMetrics(kp);
  document.getElementById("metricsOutput").textContent = JSON.stringify(metrics, null, 2);

  const prompt = buildPrompt(metrics);
  let result;
  try {
    result = await llm.chat({ messages: [{ role: "user", content: prompt }] });
  } catch (e) {
    console.error("❌ AI generation failed:", e);
    return;
  }

  const aiText = result.message?.content ?? "No AI response.";
  document.getElementById("aiOutput").textContent = aiText;
  logResult({ metrics, aiText });
}

// -------------------- Pose Metrics --------------------
function computeMetrics(kp) {
  function get(name) { return kp.find(k => k.name === name); }

  const lHip = get("left_hip"), rHip = get("right_hip");
  const lKnee = get("left_knee"), rKnee = get("right_knee");
  const lAnk = get("left_ankle"), rAnk = get("right_ankle");
  const lShoulder = get("left_shoulder"), rShoulder = get("right_shoulder");

  const hipDepth = (lHip.y + rHip.y) / 2 - (lKnee.y + rKnee.y) / 2;
  const shoulderDiff = lShoulder.y - rShoulder.y;
  const hipDiff = lHip.y - rHip.y;
  const kneeAngle = avgAngle(lHip, lKnee, lAnk, rHip, rKnee, rAnk);

  return {
    hipDepthRatio: hipDepth.toFixed(3),
    kneeDeviationDeg: kneeAngle.toFixed(1),
    shoulderHeightDiff: shoulderDiff.toFixed(3),
    hipHeightDiff: hipDiff.toFixed(3)
  };
}

function avgAngle(lHip, lKnee, lAnk, rHip, rKnee, rAnk) {
  const left = jointAngle(lHip, lKnee, lAnk);
  const right = jointAngle(rHip, rKnee, rAnk);
  return (left + right) / 2;
}

function jointAngle(a, b, c) {
  if (!a || !b || !c) return 180;
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
  return Math.acos(cos) * 180 / Math.PI;
}

// -------------------- AI & Logging --------------------
function buildPrompt(m) {
  return `You are a professional movement analyst. Given these metrics:
- hip_depth_ratio: ${m.hipDepthRatio}
- knee_deviation_deg: ${m.kneeDeviationDeg}
- shoulder_height_diff: ${m.shoulderHeightDiff}
- hip_height_diff: ${m.hipHeightDiff}
Provide a concise technical assessment (3–5 sentences)
and a short list of corrective exercises (5 items).`;
}

function logResult(entry) {
  const logs = JSON.parse(localStorage.getItem("fitnessLogs") || "[]");
  logs.push({ time: new Date().toISOString(), ...entry });
  localStorage.setItem("fitnessLogs", JSON.stringify(logs));
}

function downloadLogs() {
  const data = localStorage.getItem("fitnessLogs");
  if (!data) return alert("No logs yet.");
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; 
  a.download = "fitness_weblog.json"; 
  a.click();
  URL.revokeObjectURL(url);
}
