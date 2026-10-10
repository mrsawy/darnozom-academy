'use client';

import HeroWithDashboard from './hero-with-dashboard-image';

function HeroSection() {
  return (
    <>
      {/* <div className="absolute inset-0 -z-10  min-[2500px]:hidden"></div> */}

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Liquid Ether Background */}
        {/* <div className="absolute inset-0 opacity-40">
          <LiquidEther
            colors={['#5227FF', '#FF9FFC', '#B19EEF']}
            mouseForce={20}
            cursorSize={100}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </div> */}

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: 'var(--gradient-radial)' }}
        />

        <HeroWithDashboard />
      </section>
    </>
  );
}

export default HeroSection;
