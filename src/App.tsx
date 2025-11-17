import { useEffect, useState } from "react";
import Home from "./ui/Home";
import AddStock from "./ui/AddStock";
import Events from "./ui/Events";

function useRoute() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || "/");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [route, (r: string) => (window.location.hash = r)] as const;
}

export default function App() {
  const [route, nav] = useRoute();

  return (
    <div className="app">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="big">LensTracker</div>
        <nav>
          <a className="link" onClick={() => nav("/")}>Home</a>{" · "}
          <a className="link" onClick={() => nav("/add")}>Add Stock</a>{" · "}
          <a className="link" onClick={() => nav("/events")}>Events</a>
        </nav>
      </div>

      {route === "/" && <Home />}
      {route === "/add" && <AddStock onStockAdded={() => nav('/')} />}
      {route === "/events" && <Events />}
    </div>
  );
}
