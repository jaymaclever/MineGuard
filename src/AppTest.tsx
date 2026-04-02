import React from 'react';

export default function AppTest() {
  return (
    <div style={{ padding: '20px', background: '#050505', color: '#fff', fontFamily: 'sans-serif' }}>
      <h1>🔧 MineGuard - Diagnostic Test</h1>
      <p>Se vê isto, o React está a funcionar!</p>
      <div style={{ background: '#111', padding: '10px', marginTop: '10px', borderRadius: '5px' }}>
        <p>✅ App carregou</p>
        <p>✅ React renderizou</p>
        <p>✅ Sem erros críticos</p>
      </div>
    </div>
  );
}
