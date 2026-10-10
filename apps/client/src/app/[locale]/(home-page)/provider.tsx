'use client';

// import Ribbons from '@/components/Ribbons';

// 0.05 opacity = 0D(13 / 255) → #9290C30D
// 0.1 opacity = 1A(26 / 255) → #9290C31A
// 0.2 opacity = 33(51 / 255) → #9290C333
// 0.5 opacity = 80(128 / 255) → #9290C380
// 0.8 opacity = CC(204 / 255) → #9290C3CC ← Current
// 1.0 opacity = FF(255 / 255) → #9290C3FF
// Quick Reference:

function Provider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-12 h-screen w-full">
        {/* <Ribbons
          colors={['#9290C3CC', '#061E29CC']}
          baseSpring={2}
          baseFriction={0.1}
          baseThickness={100}
          offsetFactor={0.003}
          maxAge={400}
          pointCount={50}
          speedMultiplier={0.5}
          enableFade
          enableShaderEffect
          effectAmplitude={2}
          // backgroundColor={[0, 0, 0, 0]}
        /> */}
      </div>
      <div className="relative z-10">{children}</div>
    </>
  );
}

export default Provider;
