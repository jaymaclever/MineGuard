import React, { Suspense } from 'react';
import { Shield } from 'lucide-react';

// Lazy load the real app
const RealApp = React.lazy(() => import('./AppReal').then(m => ({ default: m.AppReal })));

export default function App() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-[#050505] flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-[#f97316] rounded-3xl flex items-center justify-center shadow-2xl mb-8 border-4 border-black">
          <Shield size={48} className="text-black" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">MineGuard</h2>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mt-4">A carregar...</p>
      </div>
    }>
      <RealApp />
    </Suspense>
  );
}
