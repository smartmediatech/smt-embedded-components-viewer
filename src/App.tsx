import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Challenges } from "./pages/Challenges";
import { Discover } from "./pages/Discover";
import { Rewards } from "./pages/Rewards";
import { Giveaways } from "./pages/Giveaways";
import { Marketplace } from "./pages/Marketplace";
import { Collection } from "./pages/Collection";
import { Map } from "./pages/Map";

function App() {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "REWARDS_EVENT") {
        console.log("[REWARDS_EVENT]", event.data.event, event.data.details);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  return (
    <HashRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/discover" replace />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/giveaways" element={<Giveaways />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/map" element={<Map />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
