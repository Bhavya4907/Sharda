"use client";

import { useEffect, useRef } from "react";
import { GraphNode, GraphEdge } from "@/lib/api";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Simple force-directed layout rendered on Canvas
export default function KnowledgeGraph({ nodes, edges }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;

    // Initialize positions randomly
    const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    nodes.forEach((n) => {
      pos[n.id] = {
        x: Math.random() * (W - 100) + 50,
        y: Math.random() * (H - 100) + 50,
        vx: 0,
        vy: 0,
      };
    });

    const edgeMap = new Set(edges.map((e) => `${e.source}-${e.target}`));

    function isConnected(a: string, b: string) {
      return edgeMap.has(`${a}-${b}`) || edgeMap.has(`${b}-${a}`);
    }

    function masteryColor(mastery: number) {
      if (mastery >= 0.75) return "#22c55e"; // green
      if (mastery >= 0.4) return "#f59e0b";  // amber
      return "#ef4444";                       // red
    }

    let frame = 0;
    const MAX_FRAMES = 200;

    function simulate() {
      // Repulsion
      nodes.forEach((a) => {
        nodes.forEach((b) => {
          if (a.id === b.id) return;
          const dx = pos[a.id].x - pos[b.id].x;
          const dy = pos[a.id].y - pos[b.id].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 3000 / (d * d);
          pos[a.id].vx += (dx / d) * force;
          pos[a.id].vy += (dy / d) * force;
        });
      });

      // Attraction along edges
      edges.forEach((e) => {
        const s = pos[e.source];
        const t = pos[e.target];
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (d - 150) * 0.03;
        s.vx += (dx / d) * force;
        s.vy += (dy / d) * force;
        t.vx -= (dx / d) * force;
        t.vy -= (dy / d) * force;
      });

      // Update + dampen + clamp
      nodes.forEach((n) => {
        const p = pos[n.id];
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x = Math.max(60, Math.min(W - 60, p.x + p.vx));
        p.y = Math.max(40, Math.min(H - 40, p.y + p.vy));
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw edges
      edges.forEach((e) => {
        const s = pos[e.source];
        const t = pos[e.target];
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((n) => {
        const p = pos[n.id];
        const color = masteryColor(n.mastery);
        const r = 28;

        // Glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r + 10);
        grd.addColorStop(0, color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#1f2937";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = "#f3f4f6";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const words = n.label.split(" ");
        if (words.length === 1) {
          ctx.fillText(n.label, p.x, p.y);
        } else {
          ctx.fillText(words[0], p.x, p.y - 6);
          ctx.fillText(words.slice(1).join(" "), p.x, p.y + 7);
        }
      });
    }

    function tick() {
      if (frame < MAX_FRAMES) {
        simulate();
        frame++;
      }
      draw();
      requestAnimationFrame(tick);
    }

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={700}
        height={380}
        className="w-full rounded-xl bg-gray-900 border border-gray-800"
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Strong</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>Learning</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Weak</span>
      </div>
    </div>
  );
}
