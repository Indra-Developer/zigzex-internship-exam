import type { RefObject } from "react";

export type BrowserPermission = "granted" | "denied" | "prompt" | "unknown";

type PreExamChecksProps = {
  fullscreenActive: boolean;
  cameraPermission: BrowserPermission;
  microphonePermission: BrowserPermission;
  cameraReady: boolean;
  microphoneReady: boolean;
  microphoneLevel: number;
  cameraVideoRef: RefObject<HTMLVideoElement | null>;
  cameraTesting: boolean;
  microphoneTesting: boolean;
  onEnterFullscreen: () => void;
  onTestCamera: () => void;
  onTestMicrophone: () => void;
};

function PermissionBadge({ label, state }: { label: string; state: BrowserPermission }) {
  const ready = state === "granted";
  const blocked = state === "denied";
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? "bg-emerald-50 text-emerald-700" : blocked ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{label}: {ready ? "Ready" : blocked ? "Blocked" : state === "prompt" ? "Required" : "Check"}</span>;
}

export function PreExamChecks({ fullscreenActive, cameraPermission, microphonePermission, cameraReady, microphoneReady, microphoneLevel, cameraVideoRef, cameraTesting, microphoneTesting, onEnterFullscreen, onTestCamera, onTestMicrophone }: PreExamChecksProps) {
  const cameraBlocked = cameraPermission === "denied";
  const microphoneBlocked = microphonePermission === "denied";

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-700">Pre-examination checks</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Complete these checks in order</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Test the camera first, the microphone second and fullscreen mode last. The examination becomes available after all three checks are ready.</p>
        </div>
        <div className="flex flex-wrap gap-2"><PermissionBadge label="Camera" state={cameraPermission} /><PermissionBadge label="Microphone" state={microphonePermission} /><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${fullscreenActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>Fullscreen: {fullscreenActive ? "Ready" : "Required"}</span></div>
      </div>

      <ol className="mt-6 grid gap-4 lg:grid-cols-3">
        <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span><div><p className="font-bold text-slate-950">Test camera</p><p className="mt-1 text-sm leading-6 text-slate-500">Allow camera access and confirm the live preview.</p></div></div>
          <div className="mt-4 overflow-hidden rounded-xl bg-slate-900"><video ref={cameraVideoRef} muted playsInline className={`aspect-video w-full object-cover ${cameraReady ? "" : "hidden"}`} />{!cameraReady && <div className="flex aspect-video items-center justify-center px-4 text-center text-xs leading-5 text-slate-400">Camera preview will appear here after access is allowed.</div>}</div>
          <button type="button" onClick={onTestCamera} disabled={cameraTesting || microphoneTesting} className="mt-4 w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">{cameraTesting ? "Testing camera…" : cameraReady ? "Test camera again" : "Allow and test camera"}</button>
        </li>
        <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">2</span><div><p className="font-bold text-slate-950">Test microphone</p><p className="mt-1 text-sm leading-6 text-slate-500">Allow microphone access and speak to confirm the input level.</p></div></div>
          <div className="mt-4 rounded-xl bg-slate-900 p-4"><div className="flex items-center justify-between text-xs font-semibold text-slate-300"><span>Microphone level</span><span>{microphoneReady ? `${microphoneLevel}%` : "Not tested"}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-100" style={{ width: `${microphoneReady ? microphoneLevel : 0}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-400">{microphoneReady ? "Speak normally. The level should respond to your voice." : "The microphone level will appear here after access is allowed."}</p></div>
          <button type="button" onClick={onTestMicrophone} disabled={!cameraReady || microphoneTesting} className="mt-4 w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">{microphoneTesting ? "Testing microphone…" : microphoneReady ? "Test microphone again" : "Allow and test microphone"}</button>
        </li>
        <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">3</span><div><p className="font-bold text-slate-950">Enter fullscreen mode</p><p className="mt-1 text-sm leading-6 text-slate-500">Enter fullscreen after the camera and microphone checks are ready.</p></div></div>
          <div className="mt-4 flex aspect-video items-center justify-center rounded-xl bg-slate-900 px-5 text-center text-sm leading-6 text-slate-300">Fullscreen mode will be active for the examination.</div>
          <button type="button" onClick={onEnterFullscreen} disabled={!cameraReady || !microphoneReady || fullscreenActive || cameraTesting || microphoneTesting} className="mt-4 w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">{fullscreenActive ? "Fullscreen active" : "Enter fullscreen mode"}</button>
        </li>
      </ol>

      {(cameraBlocked || microphoneBlocked) && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p className="font-bold">Permission access is blocked</p><p className="mt-2 leading-6">Allow the blocked permission in your browser, then return here and select the test button again.</p><ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-6"><li>Select the site settings or lock icon beside the website address.</li><li>Set Camera and Microphone to <strong>Allow</strong>.</li><li>Close the site settings panel and select the relevant test button again.</li></ol><p className="mt-3 leading-6">If the browser displays a permission prompt, select <strong>Allow</strong> for the requested device.</p></div>}
      {!cameraBlocked && !microphoneBlocked && (!cameraReady || !microphoneReady) && <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">Complete the checks from step 1 through step 3. The Start examination button will become available automatically.</p>}
    </section>
  );
}
