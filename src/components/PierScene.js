import React from 'react';
import { Dimensions } from 'react-native';
import Svg, {
  Path, Line, Ellipse, G, Defs, RadialGradient, Stop, Rect, Text as SvgText,
} from 'react-native-svg';

const ink = 'rgba(240,237,230,0.82)';
const inkFaint = 'rgba(240,237,230,0.18)';
const inkMid = 'rgba(240,237,230,0.42)';

export default function PierScene({ width, height = 190, handle = '' }) {
  const W = width ?? Dimensions.get('window').width;
  const H = height;

  const vpY = H * 0.22;
  const nearY = H + 4;

  const nearLeft = W * 0.12;
  const nearRight = W * 0.88;
  const farLeft = W * 0.455;
  const farRight = W * 0.545;

  const leftX = (y) => nearLeft + ((y - nearY) / (vpY - nearY)) * (farLeft - nearLeft);
  const rightX = (y) => nearRight + ((y - nearY) / (vpY - nearY)) * (farRight - nearRight);

  // Plank y positions — wider gaps near viewer (perspective)
  const plankYs = [];
  let gy = vpY + 12;
  [9, 12, 15, 19, 25, 32, 41, 52, 65].forEach((gap) => {
    plankYs.push(gy);
    gy += gap;
  });

  // Railing post y positions
  const postYs = plankYs.filter((_, i) => i % 2 === 0);
  const postH = (y) => {
    const t = (y - vpY) / (nearY - vpY);
    return 7 + t * 18;
  };

  // Water lines
  const waterLines = [];
  let wy = vpY + 3;
  [5, 7, 9, 12, 16, 21, 27].forEach((sp, i) => {
    const lx = leftX(wy);
    const rx = rightX(wy);
    const sw = i < 2 ? 0.5 : 0.85;
    const op = i < 2 ? 0.4 : 0.65;
    waterLines.push(
      <Path key={`wl${i}`}
        d={`M 0,${wy} Q ${lx * 0.45},${wy + (i % 2 ? 1.5 : -1)} ${lx},${wy}`}
        stroke={i < 2 ? inkFaint : inkMid}
        strokeWidth={sw} strokeLinecap="round" fill="none" opacity={op}
      />
    );
    waterLines.push(
      <Path key={`wr${i}`}
        d={`M ${W},${wy} Q ${rx + (W - rx) * 0.55},${wy + (i % 2 ? -1 : 1.5)} ${rx},${wy}`}
        stroke={i < 2 ? inkFaint : inkMid}
        strokeWidth={sw} strokeLinecap="round" fill="none" opacity={op}
      />
    );
    wy += sp;
  });

  // Figure geometry
  const figCx = W * 0.5;
  const figHeadY = vpY - 16;
  const figW = 13;
  const figBodyH = 15;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id="pglow" cx="50%" cy="22%" r="45%">
          <Stop offset="0%" stopColor="rgba(126,184,247,0.12)" />
          <Stop offset="100%" stopColor="rgba(9,9,15,0)" />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={W} height={H} fill="url(#pglow)" />

      {/* Horizon */}
      <Path
        d={`M 0,${vpY} Q ${W*0.3},${vpY-1} ${W*0.5},${vpY} Q ${W*0.7},${vpY+1} ${W},${vpY-0.5}`}
        stroke={inkMid} strokeWidth={0.8} fill="none" opacity={0.55}
      />

      {/* Sky marks */}
      {[
        { d: `M ${W*0.07},${H*0.05} Q ${W*0.16},${H*0.03} ${W*0.26},${H*0.06}`, op: 0.22 },
        { d: `M ${W*0.66},${H*0.04} Q ${W*0.77},${H*0.02} ${W*0.88},${H*0.05}`, op: 0.20 },
        { d: `M ${W*0.37},${H*0.11} Q ${W*0.46},${H*0.09} ${W*0.57},${H*0.11}`, op: 0.18 },
        { d: `M ${W*0.14},${H*0.13} Q ${W*0.22},${H*0.11} ${W*0.34},${H*0.13}`, op: 0.14 },
      ].map((m, i) => (
        <Path key={`sky${i}`} d={m.d} stroke={ink} strokeWidth={0.7}
          strokeLinecap="round" fill="none" opacity={m.op} />
      ))}

      {/* Water lines */}
      {waterLines}

      {/* Plank lines */}
      {plankYs.map((y, i) => (
        <Line key={`plank${i}`}
          x1={leftX(y) + 1} y1={y}
          x2={rightX(y) - 1} y2={y + (i % 3 === 0 ? 0.5 : 0)}
          stroke={ink}
          strokeWidth={0.4 + i * 0.07}
          strokeLinecap="round"
          opacity={0.25 + i * 0.055}
        />
      ))}

      {/* Pier rail edges */}
      <Path
        d={`M ${nearLeft},${nearY} Q ${nearLeft+(farLeft-nearLeft)*0.45},${nearY+(vpY-nearY)*0.45+6} ${farLeft},${vpY}`}
        stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none"
      />
      <Path
        d={`M ${nearRight},${nearY} Q ${nearRight+(farRight-nearRight)*0.45},${nearY+(vpY-nearY)*0.45+6} ${farRight},${vpY}`}
        stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none"
      />

      {/* Handrails */}
      <Line x1={nearLeft+5} y1={nearY-22} x2={farLeft+1} y2={vpY-7}
        stroke={ink} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
      <Line x1={nearRight-5} y1={nearY-22} x2={farRight-1} y2={vpY-7}
        stroke={ink} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />

      {/* Railing posts — left */}
      {postYs.map((y, i) => (
        <Line key={`lp${i}`}
          x1={leftX(y)+2} y1={y} x2={leftX(y)+2} y2={y - postH(y)}
          stroke={ink} strokeWidth={0.9} strokeLinecap="round" opacity={0.5}
        />
      ))}

      {/* Railing posts — right */}
      {postYs.map((y, i) => (
        <Line key={`rp${i}`}
          x1={rightX(y)-2} y1={y} x2={rightX(y)-2} y2={y - postH(y)}
          stroke={ink} strokeWidth={0.9} strokeLinecap="round" opacity={0.5}
        />
      ))}

      {/* Piling posts below planks */}
      {[plankYs[2], plankYs[4], plankYs[6]].filter(Boolean).map((y, i) => (
        <G key={`pile${i}`}>
          <Line x1={leftX(y)} y1={y} x2={leftX(y)-1} y2={y+14}
            stroke={ink} strokeWidth={1.1} strokeLinecap="round" opacity={0.38} />
          <Line x1={rightX(y)} y1={y} x2={rightX(y)+1} y2={y+14}
            stroke={ink} strokeWidth={1.1} strokeLinecap="round" opacity={0.38} />
        </G>
      ))}

      {/* The goal-setter silhouette at far end */}
      <G opacity={0.88}>
        <Ellipse cx={figCx} cy={figHeadY} rx={figW*0.42} ry={figW*0.48} fill={ink} />
        <Path
          d={`M ${figCx-figW*0.68},${figHeadY+figW*0.5}
              Q ${figCx},${figHeadY+figW*0.28}
              ${figCx+figW*0.68},${figHeadY+figW*0.5}
              L ${figCx+figW*0.52},${figHeadY+figBodyH+figW*0.5}
              L ${figCx-figW*0.52},${figHeadY+figBodyH+figW*0.5} Z`}
          fill={ink}
        />
      </G>

      {/* Handle label above the figure */}
      {!!handle && (
        <SvgText
          x={W * 0.5} y={figHeadY - 9}
          textAnchor="middle"
          fontSize={9} fontWeight="600"
          fill="rgba(126,184,247,0.9)"
        >
          @{handle}
        </SvgText>
      )}
    </Svg>
  );
}
