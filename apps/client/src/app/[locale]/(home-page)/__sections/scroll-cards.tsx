'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function ScrollCards() {
  const t = useTranslations('ScrollCards');
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [_viewportHeight, setViewportHeight] = useState(0);
  const ticking = useRef(false);

  const cardsData = [
    {
      image: '/images/home-section-cards/card1/compressed/1.jpg',
      styles: { backgroundImage: "url('/images/home-section-cards/card1/compressed/bg.jpg')" },
      tag: t('cards.0.tag'),
      title: t('cards.0.title'),
      description: t('cards.0.description'),
    },
    {
      image: '/images/home-section-cards/card2/compressed/5.jpg',
      styles: { backgroundImage: "url('/images/home-section-cards/card2/compressed/bg.jpg')" },
      tag: t('cards.4.tag'),
      title: t('cards.4.title'),
      description: t('cards.4.description'),
    },
    {
      image: '/images/home-section-cards/card3/compressed/3.jpg',
      styles: { backgroundImage: "url('/images/home-section-cards/card3/compressed/bg.jpg')" },
      tag: t('cards.5.tag'),
      title: t('cards.5.title'),
      description: t('cards.5.description'),
    },
    // {
    //   image: '/images/home-section-cards/card4/6.jpg',
    //   styles: { backgroundImage: "url('/images/home-section-cards/card4/bg.jpg')" },
    //   tag: t('cards.3.tag'), title: t('cards.3.title'), description: t('cards.3.description')
    // },
    // {
    //   image: '/images/home-section-cards/card5/4.jpg',
    //   styles: { backgroundImage: "url('/images/home-section-cards/card5/bg.jpg')" },
    //   tag: t('cards.4.tag'), title: t('cards.4.title'), description: t('cards.4.description')
    // },
    // {
    //   image: '/images/home-section-cards/card6/2.jpg',
    //   styles: { backgroundImage: "url('/images/home-section-cards/card6/bg.jpg')" },
    //   tag: t('cards.5.tag'), title: t('cards.5.title'), description: t('cards.5.description')
    // },
  ];

  // More responsive timing function with shorter duration
  const cardStyle = {
    height: '60vh',
    maxHeight: '600px',
    borderRadius: '32px',
    transition:
      'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform, opacity',
  };

  // Track viewport height for conditional styling
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    // Set initial height
    updateViewportHeight();

    // Listen for resize events
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    // Create intersection observer to detect when section is in view
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 } // Start observing when 10% of element is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    // Optimized scroll handler using requestAnimationFrame
    const handleScroll = () => {
      if (!ticking.current) {
        globalThis.requestAnimationFrame(() => {
          if (!sectionRef.current) return;

          const sectionRect = sectionRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const totalScrollDistance = viewportHeight * 3.5;

          // Calculate the scroll progress
          let progress = 0;
          if (sectionRect.top <= 0) {
            progress = Math.min(1, Math.max(0, Math.abs(sectionRect.top) / totalScrollDistance));
          }

          // Determine which card should be visible based on progress
          const cardCount = cardsData.length;
          const step = 1 / cardCount;

          let newIndex = Math.floor(progress / step);
          if (newIndex >= cardCount) newIndex = cardCount - 1;

          setActiveCardIndex(newIndex);
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    const currentSectionRef = sectionRef.current;

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (currentSectionRef) {
        observer.unobserve(currentSectionRef);
      }
    };
  }, [cardsData.length]);

  return (
    <div ref={sectionRef} className="relative" style={{ height: '450vh' }}>
      <section
        className="sticky top-0 h-screen w-full overflow-hidden py-10 md:py-16"
        id="why-safier">
        <div className="container mx-auto flex h-full flex-col px-6 lg:px-8">
          <div className="mb-2 md:mb-8">
            <div className="mb-4 flex items-center gap-4 pt-4 sm:pt-6 md:mb-4 md:pt-4">
              <div
                className="pulse-chip animate-fade-in opacity-0"
                style={{
                  animationDelay: '0.1s',
                }}>
                <span className="bg-primary/10 text-primary mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                  02
                </span>
                <span className="text-sm font-medium tracking-wider uppercase">{t('badge')}</span>
              </div>
            </div>

            <h2 className="section-title font-display text-primary mb-2 text-4xl font-bold sm:text-5xl md:mb-4 md:text-6xl">
              {t('title')}
            </h2>
          </div>

          <div ref={cardsContainerRef} className="perspective-1000 relative mt-4 flex-1 md:mt-8">
            {cardsData.map((card, index) => {
              const isVisible = isIntersecting && activeCardIndex >= index;

              // Calculate stack positions
              // eslint-disable-next-line i18next/no-literal-string -- CSS length, not user-visible copy
              let translateY = '200px';
              let scale = 0.9;
              let opacity = 0;
              const zIndex = 10 * (index + 1);

              if (isVisible) {
                opacity = 1;
                // Active card logic
                if (activeCardIndex === index) {
                  translateY = `${20 + (cardsData.length - 1 - index) * 5}px`;
                  scale = 1;
                } else if (activeCardIndex > index) {
                  // Stacked cards logic
                  const diff = activeCardIndex - index;
                  translateY = `${20 + (cardsData.length - 1 - index) * 15 + diff * 12}px`;
                  scale = 1 - diff * 0.04;
                  opacity = 1 - diff * 0.15;
                }
              }

              return (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col overflow-hidden border border-gray-100 shadow-2xl transition-all duration-700 md:flex-row ${isVisible ? 'animate-card-enter' : ''}`}
                  style={{
                    ...cardStyle,
                    zIndex,
                    transform: `translateY(${translateY}) scale(${scale})`,
                    opacity,
                    pointerEvents: activeCardIndex === index ? 'auto' : 'none',
                    ...card.styles,
                  }}>
                  <div className="flex h-1/2 flex-1 items-center justify-center p-6 md:h-full md:p-12">
                    <div className="relative h-full w-full">
                      <Image
                        className="rounded-2xl object-cover shadow-lg transition-transform duration-500 hover:scale-[1.02]"
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col bg-white/40 p-8 pt-3 pb-3 backdrop-blur-sm md:p-16">
                    <div className="mb-4 inline-block">
                      <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold tracking-widest whitespace-nowrap uppercase">
                        {card.tag}
                      </span>
                    </div>
                    <h3
                      className={cn(
                        'font-display mb-6 text-xl leading-[1.1] font-bold text-gray-900 sm:text-3xl md:text-5xl'
                        // viewportHeight >= 700 && 'text-2xl'
                      )}>
                      {card.title}
                    </h3>
                    <p
                      className={cn(
                        'max-w-lg text-base leading-relaxed text-gray-600 md:text-xl'
                        // viewportHeight >= 700 && 'text-lg'
                      )}>
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ScrollCards;
