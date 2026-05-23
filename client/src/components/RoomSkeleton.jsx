import React from "react";

/**
 * RoomSkeleton — shown while room state is loading.
 * Uses the .skeleton shimmer class from index.css.
 */
export function RoomSkeleton() {
  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden"
         style={{ background: "#050d1a" }}>
      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Fake nav */}
        <div className="flex-shrink-0 border-b border-slate-800/60 px-3 py-2.5 flex items-center gap-3">
          <div className="skeleton h-5 w-32 rounded-lg" />
          <div className="skeleton h-4 w-12 rounded-full ml-2" />
          <div className="ml-auto flex gap-2">
            <div className="skeleton h-7 w-20 rounded-lg" />
            <div className="skeleton h-7 w-20 rounded-lg" />
          </div>
        </div>
        {/* Fake video */}
        <div className="skeleton w-full aspect-video" />
        {/* Fake controls */}
        <div className="p-3 space-y-3 flex-1">
          <div className="skeleton h-10 w-full rounded-xl" />
          <div className="skeleton h-16 w-full rounded-xl" />
          <div className="flex gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton h-8 flex-1 rounded-lg" />
            ))}
          </div>
        </div>
        {/* Fake bottom bar */}
        <div className="lg:hidden border-t border-slate-800/60 px-3 py-2 flex gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 w-8 rounded-full" />)}
          <div className="skeleton h-8 w-20 rounded-xl ml-auto" />
        </div>
      </div>
      {/* Fake sidebar */}
      <div className="hidden lg:block w-96 border-l border-slate-800/60">
        <div className="skeleton h-12 w-full" />
        <div className="p-4 space-y-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex gap-2 items-start">
              <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3 rounded" style={{ width: `${40 + i * 8}%` }} />
                <div className="skeleton h-3 rounded" style={{ width: `${60 + i * 5}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * RoomNotFound — shown when room ID yields no state after timeout.
 */
export function RoomNotFound({ roomId, onGoHome }) {
  return (
    <div className="h-screen flex items-center justify-center p-6"
         style={{ background: "#050d1a" }}>
      <div className="text-center max-w-sm glass rounded-2xl p-8">
        <div className="text-5xl mb-4">🚪</div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Room Not Found</h2>
        <p className="text-slate-400 text-sm mb-1">
          Room <code className="text-sky-400 bg-navy-800 px-1.5 py-0.5 rounded">{roomId}</code>
        </p>
        <p className="text-slate-500 text-sm mb-6">
          This room may have expired or never existed. Rooms are removed after all viewers leave.
        </p>
        <button
          onClick={onGoHome}
          className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700
                     text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          🏠 Go to Home
        </button>
      </div>
    </div>
  );
}
