import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: "linear-gradient(135deg, #050d1a 0%, #071220 50%, #050d1a 100%)" }}>
      <div className="text-center max-w-md">
        {/* Animated icon */}
        <div className="text-7xl mb-6 animate-bounce select-none">🎬</div>
        <h1 className="text-5xl font-bold mb-3 text-gradient-sky">404</h1>
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Room Not Found</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          This room link has expired, was never created, or doesn't exist.<br/>
          Double-check the link or start a fresh watch party.
        </p>
        <button
          onClick={() => nav("/")}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500
                     active:bg-sky-700 text-white font-semibold px-6 py-3 rounded-xl
                     transition-all duration-200 shadow-sky-glow hover:shadow-lg"
        >
          🏠 Back to Home
        </button>
      </div>
    </div>
  );
}
