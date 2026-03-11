import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./Pages/HomePage";
import AdminDashboard from "./Pages/AdminDashboard";
import FiverrForm from "./Pages/FiverrForm";
import DirectForm from "./Pages/DirectForm";
import MerciPage from "./Pages/MerciPage";
import StartOrder from "./Pages/StartOrder";
import RevisionPage from "./Pages/RevisionPage";










export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/start" element={<StartOrder />} />
        <Route path="/form" element={<DirectForm />} />
        <Route path="/merci" element={<MerciPage />} />
        <Route path="/fiverr" element={<FiverrForm />} />
        <Route path="/revision" element={<RevisionPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
