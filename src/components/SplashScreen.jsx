import { useEffect, useState } from "react";
import "./SplashScreen.css";
import logo from "../garph-logo.png";

export default function SplashScreen({ onFinish, duration = 2200 }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), duration - 400);
    const doneTimer = setTimeout(() => onFinish?.(), duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onFinish]);

  return (
    <div className={`splash ${fadeOut ? "splash--fade" : ""}`}>
      <div className="splash__ring" />
      <img src={logo} alt="Garph" className="splash__logo" />
      <div className="splash__bar">
        <div className="splash__bar-fill" />
      </div>
      <p className="splash__tagline">TRACK &middot; PLAN &middot; GROW</p>
    </div>
  );
}
