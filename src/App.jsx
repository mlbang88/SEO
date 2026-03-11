import { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";

// ─── Firebase config ───────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// ─── Components & Pages ───────────────────────────────────────────────────
import HomePage from "./Pages/HomePage";
import AdminDashboard from "./Pages/AdminDashboard";
import OrderForm from "./Pages/OrderForm";
import FiverrForm from "./Pages/FiverrForm";
import DirectForm from "./Pages/DirectForm";
import MerciPage from "./Pages/MerciPage";
import StartOrder from "./Pages/StartOrder";
import RevisionPage from "./Pages/RevisionPage";
import { validateToken } from "./Components/TokenValidator";

const firebaseConfig = {
  apiKey: "AIzaSyC9lCKehSbbnmmKAnVhukDYWN86JdMLKFU",
  authDomain: "seo-description-fiverr.firebaseapp.com",
  projectId: "seo-description-fiverr",
  storageBucket: "seo-description-fiverr.firebasestorage.app",
  messagingSenderId: "47623981903",
  appId: "1:47623981903:web:84005b9e2103ab8223d33a",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── Constants ─────────────────────────────────────────────────────────────
// (Firebase setup kept here just in case, though unused in App)

// ─── Main App Component ───────────────────────────────────────────────────
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
