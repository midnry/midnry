/** Local capability checks. No user-agent blacklist, telemetry or saved hardware fingerprint. */
export const COMPATIBILITY_STEPS = Object.freeze([
  ["browser", "Browser features"],
  ["graphics", "3D graphics"],
  ["assets", "Game files"],
  ["performance", "Rendering performance"],
]);

export function newCompatibilityReport() {
  return {
    status: "checking", summary: "Checking this browser and device…",
    recommendedPreset: null, testedPreset: null, frameCostMs: null, observedFps: null,
    checks: COMPATIBILITY_STEPS.map(([id, label]) => ({ id, label, status: "checking", detail: "Waiting" })),
  };
}

export function updateCheck(report, id, status, detail) {
  const check = report.checks.find((item) => item.id === id);
  if (check) Object.assign(check, { status, detail });
}

/** Actual context, shader and pixel tests catch blocked/disabled graphics as well as missing APIs. */
export function checkBrowser(report, scope = globalThis) {
  const required = [
    ["ResizeObserver", typeof scope.ResizeObserver === "function"],
    ["Pointer input", typeof scope.PointerEvent === "function"],
    ["Dialogs", typeof scope.HTMLDialogElement?.prototype?.showModal === "function"],
  ];
  const missing = required.filter(([, passed]) => !passed).map(([name]) => name);
  if (missing.length) {
    updateCheck(report, "browser", "failed", `Update your browser. Missing support: ${missing.join(", ")}.`);
    Object.assign(report, { status: "unsupported", summary: "This browser is missing features the game needs." });
    return false;
  }
  updateCheck(report, "browser", "passed", "Game input, loading and menus are supported.");
  let gl, program, buffer, vertex, fragment;
  try {
    // Fresh canvases allow a rejected context configuration to recover on
    // Apple touch devices without bypassing the actual shader/pixel check.
    for (let attempt = 0; attempt < 3 && !gl; attempt++) {
      const canvas = scope.document.createElement("canvas");
      canvas.width = canvas.height = 4;
      gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true,
        ...(attempt ? { powerPreference: "low-power" } : {}) });
      if (gl && attempt) report.lowPowerRequired = true;
    }
    if (!gl) throw new Error("WebGL 2 is unavailable. Enable hardware acceleration or try an updated browser.");
    if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 2048 || gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) < 2048)
      throw new Error("This graphics device cannot load the game's detailed textures.");
    const shader = (type, source) => {
      const value = gl.createShader(type);
      gl.shaderSource(value, source);
      gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
        gl.deleteShader(value);
        throw new Error("The graphics driver could not prepare 3D rendering.");
      }
      return value;
    };
    vertex = shader(gl.VERTEX_SHADER, "#version 300 es\nin vec2 position; void main(){gl_Position=vec4(position,0.,1.);}");
    fragment = shader(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float; out vec4 color; void main(){color=vec4(.18,.25,.22,1.);}");
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("The graphics driver could not initialize 3D rendering.");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, 4, 4);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const pixel = new Uint8Array(4);
    gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    if (gl.getError() !== gl.NO_ERROR || pixel[3] !== 255 || pixel[1] < 40)
      throw new Error("The device did not complete the 3D rendering test.");
    updateCheck(report, "graphics", "passed", "The device successfully rendered a 3D test.");
    return true;
  } catch (error) {
    updateCheck(report, "graphics", "failed", String(error.message || error));
    Object.assign(report, { status: "unsupported", summary: "3D graphics are unavailable on this browser or device." });
    return false;
  } finally {
    if (gl) {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }
}

/** A short scene sample recommends quality; it does not certify a sustained frame rate. */
export function performanceRecommendation(frameCostMs, observedFps, preset) {
  if (!Number.isFinite(frameCostMs) || frameCostMs < 0)
    return { status: "unsupported", recommendedPreset: "performance", summary: "The rendering test did not finish." };
  const limited = frameCostMs > 1000 / 60;
  const recommendedPreset = limited
    ? preset === "high" && frameCostMs <= 1000 / 30 ? "balanced" : "performance"
    : preset;
  return {
    status: limited ? "limited" : "ready", recommendedPreset,
    summary: limited
      ? preset === "performance"
        ? "3D works, but this device has limited performance at the lowest quality preset."
        : "3D works. Lower graphics are recommended for smoother play."
      : "Compatibility checks passed. Ready to play.",
    // Display cadence and render cost are separate. A 60 Hz display never
    // receives a claim that it can show 120 FPS merely because work was fast.
    sampledFps: Number.isFinite(observedFps) ? Math.max(1, Math.round(observedFps)) : null,
  };
}

export async function checkScene(report, renderer, preset, signal) {
  if (renderer.assetErrors.length) {
    updateCheck(report, "assets", "failed", "Some game files could not load. Check your connection and retry.");
    Object.assign(report, { status: "unsupported", summary: "The game files did not finish loading." });
    return false;
  }
  updateCheck(report, "assets", "passed", "Detailed materials, character models and lighting loaded.");
  const gl = renderer.renderer.getContext();
  try {
    // First render warms shader/material caches; exclude it from the quality recommendation.
    renderer.render();
    gl.finish();
    if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error("Graphics initialization was interrupted.");
    const costs = [], times = [];
    const began = performance.now();
    for (let i = 0; i < 8; i++) {
      if (signal?.aborted) return false;
      const stamp = await new Promise((resolve) => requestAnimationFrame(resolve));
      if (signal?.aborted) return false;
      const start = performance.now();
      renderer.render();
      // Wait for this small loading-screen sample so the measurement includes
      // GPU execution rather than just JavaScript submitting drawing commands.
      gl.finish();
      if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error("The device could not complete the scene test.");
      costs.push(performance.now() - start);
      times.push(stamp);
      if (costs.length >= 3 && performance.now() - began > 1800) break;
    }
    const sorted = [...costs].sort((a, b) => a - b);
    const cost = sorted[Math.floor(sorted.length / 2)];
    const cadence = times.length > 1 ? (times.length - 1) * 1000 / (times.at(-1) - times[0]) : null;
    const result = performanceRecommendation(cost, cadence, preset);
    Object.assign(report, result, {
      testedPreset: preset, frameCostMs: Math.round(cost * 10) / 10,
      observedFps: result.sampledFps,
    });
    updateCheck(report, "performance", result.status === "limited" ? "warning" : "passed",
      `${preset[0].toUpperCase() + preset.slice(1)} sampled at ${report.frameCostMs} ms per render. ${result.status === "limited" ? preset === "performance" ? "Automatic resolution in Settings can help; smoothness will vary with this device." : "Try " + result.recommendedPreset + " quality." : "Rendering test completed."} This is a brief test, not a frame-rate guarantee.`);
    return true;
  } catch (error) {
    updateCheck(report, "performance", "failed", String(error.message || error));
    Object.assign(report, { status: "unsupported", summary: "The device could not render the loaded 3D scene." });
    return false;
  }
}
