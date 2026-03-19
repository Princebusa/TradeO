import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { MarketsPage } from './pages/MarketsPage';
import { MarketDetailPage } from './pages/MarketDetailPage';
import './index.css';

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen p-4 md:p-8">
    <Navbar />
    <main>
      {children}
    </main>
  </div>
);

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/markets" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/market/:ticker" element={<MarketDetailPage />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
