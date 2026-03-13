import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Changelog from "./pages/Changelog";

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Home />} />
      <Route path="/admin"     element={<Admin />} />
      <Route path="/about"     element={<About />} />
      <Route path="/changelog" element={<Changelog />} />
    </Routes>
  );
}
