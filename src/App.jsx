import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Developer from "./pages/Developer";

export default function App() {
  return (
    <Router>
      <div className="scanline"></div> {/* Cyber animation overlay */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/developer" element={<Developer />} />
      </Routes>
    </Router>
  );
}
