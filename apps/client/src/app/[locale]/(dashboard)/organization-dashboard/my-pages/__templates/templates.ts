import type { Data } from '@puckeditor/core';

/**
 * Prebuilt page templates. Each `data` is valid Puck `Data` that the editor can load
 * and the user can freely edit. The component names must match the keys registered
 * in the Puck config in `../__components/puck-editor.tsx`.
 */
export interface PageTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  preview?: string;
  data: Data;
}

const comp = (type: string, props: Record<string, unknown> = {}) => ({
  type,
  props: { id: `${type}-${Math.random().toString(36).slice(2, 10)}`, ...props },
});

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    title: 'Blank Page',
    description: 'Start from scratch with an empty canvas.',
    tags: ['blank'],
    data: {
      content: [],
      root: { props: { title: 'My Page' } },
    },
  },
  {
    id: 'course-landing',
    title: 'Course Landing Page',
    description: 'Hero, stats, course showcase, testimonials and a strong final CTA.',
    tags: ['courses', 'marketing', 'conversion'],
    preview: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    data: {
      content: [
        comp('Header'),
        comp('HeroSection', {
          title: 'Master New Skills, One Course at a Time',
          subtitle: 'Join 50,000+ learners growing their careers with our expert-led courses.',
          ctaText: 'Browse Courses',
          secondaryCtaText: 'Watch Intro',
        }),
        comp('LogoCloud'),
        comp('StatsSection'),
        comp('CourseShowcase'),
        comp('TestimonialSection'),
        comp('FAQSection'),
        comp('CTASection', {
          title: 'Ready to level up?',
          description:
            'Enroll today and start learning with zero risk — 30-day money back guarantee.',
        }),
        comp('Footer'),
      ],
      root: { props: { title: 'Course Landing Page' } },
    },
  },
  {
    id: 'about-us',
    title: 'About Us',
    description: 'Tell your story with a hero, mission statement, team and values.',
    tags: ['company', 'about'],
    preview: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
    data: {
      content: [
        comp('Header'),
        comp('HeroSection', {
          title: 'Our Story',
          subtitle: 'We exist to make high-quality learning accessible to everyone, everywhere.',
          ctaText: 'Join the Team',
          secondaryCtaText: 'Our Values',
          height: '600',
        }),
        comp('TextBlock', {
          eyebrow: 'Our Mission',
          heading: 'Empowering curious minds',
          body: 'We believe learning should be social, hands-on, and relevant. Every course, feature, and interaction is designed around that belief.',
        }),
        comp('TwoColumn', {
          eyebrow: 'How We Work',
          title: 'Learning-first, community-powered',
          description:
            'From engineers to designers, instructors to students — every voice shapes what we build.',
        }),
        comp('TeamSection'),
        comp('Quote', {
          quote: 'Learning is not a phase — it is a superpower.',
          author: 'Our Team',
        }),
        comp('Footer'),
      ],
      root: { props: { title: 'About Us' } },
    },
  },
  {
    id: 'coming-soon',
    title: 'Coming Soon',
    description: 'Launch teaser with countdown timer, newsletter signup and social proof.',
    tags: ['launch', 'marketing'],
    preview: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800',
    data: {
      content: [
        comp('HeroSection', {
          title: 'Something Big Is Coming',
          subtitle: 'Be the first to know when we launch. Sign up for early access.',
          ctaText: 'Notify Me',
          secondaryCtaText: 'Learn More',
          height: 'screen',
          backgroundColor: '#0f172a',
        }),
        comp('Countdown'),
        comp('NewsLetter'),
        comp('LogoCloud'),
        comp('Footer'),
      ],
      root: { props: { title: 'Coming Soon' } },
    },
  },
  {
    id: 'contact-page',
    title: 'Contact Page',
    description: 'Contact form, location info and a friendly FAQ.',
    tags: ['contact', 'support'],
    preview: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=800',
    data: {
      content: [
        comp('Header'),
        comp('HeroSection', {
          title: 'Let us talk',
          subtitle: 'We typically reply within one business day.',
          height: '400',
          showScrollIndicator: 'no',
          ctaText: 'Contact Us',
          secondaryCtaText: '',
        }),
        comp('ContactForm'),
        comp('FAQSection'),
        comp('Footer'),
      ],
      root: { props: { title: 'Contact Us' } },
    },
  },
  {
    id: 'pricing-page',
    title: 'Pricing Page',
    description: 'Hero, pricing table, FAQ and a final conversion CTA.',
    tags: ['pricing', 'conversion'],
    preview: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
    data: {
      content: [
        comp('Header'),
        comp('HeroSection', {
          title: 'Simple, honest pricing',
          subtitle: 'One plan for individuals, another for teams. No hidden fees.',
          height: '400',
          ctaText: 'Get Started',
          secondaryCtaText: 'Compare Plans',
          showScrollIndicator: 'no',
        }),
        comp('PricingSection'),
        comp('FAQSection'),
        comp('CTASection', {
          title: 'Still deciding?',
          description: 'Talk to our team and we will find the right plan for you.',
        }),
        comp('Footer'),
      ],
      root: { props: { title: 'Pricing' } },
    },
  },
  {
    id: 'event-page',
    title: 'Event / Webinar',
    description: 'Promotional page for a webinar, live session or event with countdown + speakers.',
    tags: ['event', 'webinar'],
    preview: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
    data: {
      content: [
        comp('HeroWithVideo', {
          title: 'Live Masterclass — Saturday 6PM',
          subtitle:
            'Join our 90-minute session with industry leaders and walk away with actionable frameworks.',
          ctaText: 'Reserve My Seat',
          secondaryCtaText: 'Add to Calendar',
        }),
        comp('Countdown', {
          title: 'Starts in',
          style: 'boxed',
        }),
        comp('Timeline'),
        comp('TeamSection'),
        comp('CTASection', {
          title: 'Seats are limited',
          description: 'Lock in your spot before registration closes.',
        }),
        comp('Footer'),
      ],
      root: { props: { title: 'Upcoming Event' } },
    },
  },
  {
    id: 'portfolio',
    title: 'Portfolio / Case Studies',
    description: 'Text intro, image gallery and key stats to showcase work.',
    tags: ['portfolio', 'showcase'],
    preview: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=800',
    data: {
      content: [
        comp('Header'),
        comp('TextBlock', {
          eyebrow: 'Portfolio',
          heading: 'Proof over promises',
          body: 'A curated selection of the work we are most proud of — across industries, sizes, and formats.',
        }),
        comp('GallerySection'),
        comp('StatsSection'),
        comp('Quote'),
        comp('CTASection', {
          title: 'Want results like these?',
          description: 'Tell us about your project and we will send a tailored proposal.',
        }),
        comp('Footer'),
      ],
      root: { props: { title: 'Portfolio' } },
    },
  },
  {
    id: 'blog-home',
    title: 'Blog Home',
    description: 'Header, featured post, article grid and newsletter signup.',
    tags: ['blog', 'content'],
    preview: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    data: {
      content: [
        comp('Header'),
        comp('TextBlock', {
          eyebrow: 'Our Blog',
          heading: 'Insights, stories and tutorials',
          body: 'Weekly writing from our instructors and community on the topics we love.',
        }),
        comp('BlogSection'),
        comp('NewsLetter'),
        comp('Footer'),
      ],
      root: { props: { title: 'Blog' } },
    },
  },
];

export const getTemplateById = (id: string): PageTemplate | undefined =>
  PAGE_TEMPLATES.find((t) => t.id === id);
