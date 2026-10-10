import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { WatchRoomPage } from './pages/WatchRoomPage';

export function App() {
  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 font-sans antialiased">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join/:token" element={<WatchRoomPage />} />
        <Route path="/room/:token" element={<WatchRoomPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </div>
  );
}

export default App;
