import React from 'react';
import Svg, { Path, Line, Ellipse, G, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const ink = 'rgba(240,237,230,0.82)';
const inkFaint = 'rgba(240,237,230,0.22)';
const inkMid = 'rgba(240,237,230,0.45)';
const inkStrong = 'rgba(240,237,230,0.92)';

export default function PierIllustration({ width = 340, height = 420 }) {
  const W = width;
  const H = height;

  // Key coordinates (scaled)
  const vp = { x: W * 0.5, y: H * 0.38 };       // vanishing point
  const shoreY = H * 0.88;                         // where figures stand
  const horizonY = H * 0.38;
  const lRailX = W * 0.18;                         // pier left at shore
  const rRailX = W * 0.82;                         // pier right at shore
  const lVpX = vp.x - W * 0.022;                  // pier left at VP
  const rVpX = vp.x + W * 0.022;

  // Interpolate pier x at given y
  const leftX = (y) => lRailX + ((y - shoreY) / (horizonY - shoreY)) * (lVpX - lRailX);
  const rightX = (y) => rRailX + ((y - shoreY) / (horizonY - shoreY)) * (rVpX - rRailX);

  const plankYs = [
    horizonY + 18, horizonY + 38, horizonY + 62,
    horizonY + 95, horizonY + 135, horizonY + 182,
    horizonY + 236, shoreY - 20, shoreY,
  ];

  // Water lines — horizontal, slightly wavy
  const waterLines = [];
  const spacings = [6, 8, 10, 13, 16, 20, 24, 28, 33];
  let wy = horizonY + 4;
  spacings.forEach((sp, i) => {
    const lx = leftX(wy) + 2;
    const rx = rightX(wy) - 2;
    // Left water
    waterLines.push(
      <Path
        key={`wl${i}`}
        d={`M 0,${wy} Q ${lx * 0.4},${wy + (i % 2 === 0 ? 1.5 : -1)} ${lx},${wy}`}
        stroke={i < 3 ? inkFaint : inkMid}
        strokeWidth={i < 3 ? 0.6 : 0.9}
        strokeLinecap="round"
        fill="none"
        opacity={0.6 + i * 0.03}
      />
    );
    // Right water
    waterLines.push(
      <Path
        key={`wr${i}`}
        d={`M ${W},${wy} Q ${rx + (W - rx) * 0.6},${wy + (i % 2 === 0 ? -1.5 : 1)} ${rx},${wy}`}
        stroke={i < 3 ? inkFaint : inkMid}
        strokeWidth={i < 3 ? 0.6 : 0.9}
        strokeLinecap="round"
        fill="none"
        opacity={0.6 + i * 0.03}
      />
    );
    wy += sp;
  });

  // Piling posts (vertical lines hanging down from plank positions)
  const posts = [1, 3, 5, 7].map((pi) => {
    const y = plankYs[pi];
    return (
      <G key={`post${pi}`}>
        <Line
          x1={leftX(y)} y1={y}
          x2={leftX(y) - 2} y2={y + 28}
          stroke={ink} strokeWidth={1.2} strokeLinecap="round" opacity={0.55}
        />
        <Line
          x1={rightX(y)} y1={y}
          x2={rightX(y) + 2} y2={y + 28}
          stroke={ink} strokeWidth={1.2} strokeLinecap="round" opacity={0.55}
        />
      </G>
    );
  });

  // Figure silhouettes at shore
  const figureData = [
    { cx: W * 0.28, headY: shoreY - 68, bodyH: 52, w: 16, opacity: 0.88 },
    { cx: W * 0.50, headY: shoreY - 76, bodyH: 58, w: 18, opacity: 0.95 },
    { cx: W * 0.72, headY: shoreY - 66, bodyH: 50, w: 15, opacity: 0.85 },
  ];

  const figures = figureData.map((f, i) => (
    <G key={`fig${i}`} opacity={f.opacity}>
      {/* Head */}
      <Ellipse cx={f.cx} cy={f.headY} rx={f.w * 0.44} ry={f.w * 0.5} fill={inkStrong} />
      {/* Body/shoulders */}
      <Path
        d={`M ${f.cx - f.w * 0.7},${f.headY + f.w * 0.52}
            Q ${f.cx},${f.headY + f.w * 0.3}
            ${f.cx + f.w * 0.7},${f.headY + f.w * 0.52}
            L ${f.cx + f.w * 0.55},${f.headY + f.bodyH}
            L ${f.cx - f.w * 0.55},${f.headY + f.bodyH} Z`}
        fill={inkStrong}
      />
    </G>
  ));

  // Sky marks — loose gestural strokes
  const skyMarks = [
    { d: `M ${W*0.08},${H*0.08} Q ${W*0.15},${H*0.06} ${W*0.22},${H*0.09}`, op: 0.25 },
    { d: `M ${W*0.12},${H*0.13} Q ${W*0.18},${H*0.11} ${W*0.28},${H*0.14}`, op: 0.18 },
    { d: `M ${W*0.65},${H*0.07} Q ${W*0.74},${H*0.05} ${W*0.86},${H*0.08}`, op: 0.22 },
    { d: `M ${W*0.7},${H*0.14} Q ${W*0.78},${H*0.12} ${W*0.88},${H*0.15}`, op: 0.16 },
    { d: `M ${W*0.38},${H*0.22} Q ${W*0.44},${H*0.20} ${W*0.52},${H*0.21}`, op: 0.20 },
  ];

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="38%" r="40%">
          <Stop offset="0%" stopColor="rgba(232,201,122,0.06)" />
          <Stop offset="100%" stopColor="rgba(9,9,15,0)" />
        </RadialGradient>
      </Defs>

      {/* Soft glow at horizon */}
      <Rect x={0} y={0} width={W} height={H} fill="url(#glow)" />

      {/* Sky marks */}
      {skyMarks.map((m, i) => (
        <Path key={`sky${i}`} d={m.d} stroke={ink} strokeWidth={0.8}
          strokeLinecap="round" fill="none" opacity={m.op} />
      ))}

      {/* Horizon line */}
      <Path
        d={`M 0,${horizonY} Q ${W*0.25},${horizonY-1.5} ${W*0.5},${horizonY} Q ${W*0.75},${horizonY+1} ${W},${horizonY-0.5}`}
        stroke={inkMid} strokeWidth={0.9} fill="none" opacity={0.7}
      />

      {/* Water */}
      {waterLines}

      {/* Pier rails */}
      <Path
        d={`M ${lRailX},${shoreY} Q ${lRailX+(lVpX-lRailX)*0.4},${(shoreY+horizonY)/2+8} ${lVpX},${horizonY}`}
        stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none"
      />
      <Path
        d={`M ${rRailX},${shoreY} Q ${rRailX+(rVpX-rRailX)*0.4},${(shoreY+horizonY)/2+8} ${rVpX},${horizonY}`}
        stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none"
      />

      {/* Planks */}
      {plankYs.map((y, i) => {
        const lx = leftX(y);
        const rx = rightX(y);
        const sw = 0.8 + i * 0.08;
        const op = 0.45 + i * 0.04;
        return (
          <Line key={`plank${i}`}
            x1={lx + 1} y1={y} x2={rx - 1} y2={y + (i % 3 === 0 ? 0.8 : 0)}
            stroke={ink} strokeWidth={sw} strokeLinecap="round" opacity={op}
          />
        );
      })}

      {/* Piling posts */}
      {posts}

      {/* Shore line */}
      <Path
        d={`M 0,${shoreY} Q ${W*0.2},${shoreY-2} ${lRailX},${shoreY} M ${rRailX},${shoreY} Q ${W*0.8},${shoreY+1} ${W},${shoreY-1}`}
        stroke={inkMid} strokeWidth={1} fill="none" opacity={0.5}
      />

      {/* Cross-hatching on pier near shore — texture detail */}
      {[1, 2, 3].map((j) => {
        const y1 = shoreY - j * 42;
        const y2 = y1 + 28;
        return (
          <Path key={`hatch${j}`}
            d={`M ${leftX(y1)+2},${y1} L ${rightX(y2)-2},${y2}`}
            stroke={ink} strokeWidth={0.6} opacity={0.18} strokeLinecap="round" fill="none"
          />
        );
      })}

      {/* Figures */}
      {figures}
    </Svg>
  );
}
