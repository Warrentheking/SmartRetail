import { useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";

const BOX_SIZE = 220;
const ICON_SIZE = 44;
const SPEED = 2.4;

export default function LoadingScreen({ label = "Loading..." }) {
  const iconRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: SPEED, y: SPEED });

  useEffect(() => {
    let frameId;

    function tick() {
      const pos = posRef.current;
      const vel = velRef.current;
      const max = BOX_SIZE - ICON_SIZE;

      pos.x += vel.x;
      pos.y += vel.y;

      if (pos.x <= 0) {
        pos.x = 0;
        vel.x = Math.abs(vel.x);
      } else if (pos.x >= max) {
        pos.x = max;
        vel.x = -Math.abs(vel.x);
      }

      if (pos.y <= 0) {
        pos.y = 0;
        vel.y = Math.abs(vel.y);
      } else if (pos.y >= max) {
        pos.y = max;
        vel.y = -Math.abs(vel.y);
      }

      if (iconRef.current) {
        iconRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-5">
      <div className="relative" style={{ width: BOX_SIZE, height: BOX_SIZE }}>
        <div
          ref={iconRef}
          className="absolute w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-card"
        >
          <ShoppingBag className="w-6 h-6 text-white" strokeWidth={2.25} />
        </div>
      </div>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
