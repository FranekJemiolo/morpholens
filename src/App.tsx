import React from "react";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

export default function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="glass-panel-glow p-8 rounded-2xl max-w-xl w-full text-center border border-cyan-500/30">
        <div className="inline-flex items-center justify-center p-4 bg-cyan-500/10 rounded-full mb-4 ring-1 ring-cyan-500/30">
          <Activity className="w-10 h-10 text-cyan-400 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
          MorphoLens
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-mono">
          Edge Anthropometric AI & Biometric Estimation
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-left">
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>100% Client-Side Wasm</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Zero-Cloud Privacy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
