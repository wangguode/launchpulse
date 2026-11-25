"use client";

/**
 * 第 1 层光学底座：环境漫射背光场 + 2.5% SVG 亚克力喷砂微噪点
 * 为全站 backdrop-filter 毛玻璃面板提供真实折射光源与微磨砂触感
 */
export default function AmbientFrostStage() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden select-none"
    >
      <div
        className="absolute -top-44 left-[8%] h-[580px] w-[580px] rounded-full blur-[96px] transform-gpu"
        style={{ background: "var(--frost-orb-1)" }}
      />
      <div
        className="absolute top-[18%] -right-32 h-[520px] w-[520px] rounded-full blur-[96px] transform-gpu"
        style={{ background: "var(--frost-orb-2)" }}
      />
      <div
        className="absolute -bottom-36 left-[34%] h-[480px] w-[480px] rounded-full blur-[96px] transform-gpu"
        style={{ background: "var(--frost-orb-3)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.032]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
