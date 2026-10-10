'use client';

import { useMemo } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { HeroSection, HeroWithVideo } from '../__sections/hero';
import FeaturedGridSection from '../__sections/featured-grid/featuredGrid.sections';

import FeatureCardsSection from '../__sections/featured-grid/featureCards.section';
import CourseShowcase from '../__sections/courseShowcase';
import StatsSection from '../__sections/stats';
import TestimonialSection from '../__sections/testimonial';
import CTASection from '../__sections/cta';
import FAQSection from '../__sections/faq';
import FooterSection from '../__sections/footer';
import InstructorSection from '../__sections/instructor';
import BlogSection from '../__sections/blog';
import TimelineSection from '../__sections/timeline';
import TeamSection from '../__sections/team';
import LogoCloudSection from '../__sections/logoCloud';
import HeaderSection from '../__sections/header';
import ImageSection from '../__sections/image';
import NewsLetterSection from '../__sections/newsLetter';
import PricingSection from '../__sections/pricing';
import ButtonSection from '../__sections/button';
import DividerSection from '../__sections/divider';
import SpacerSection from '../__sections/spacer';
import VideoSection from '../__sections/video';
import GallerySection from '../__sections/gallery';
import ContactFormSection from '../__sections/contact-form';
import CountdownSection from '../__sections/countdown';
import AlertSection from '../__sections/alert';
import QuoteSection from '../__sections/quote';
import TextBlockSection from '../__sections/text-block';
import TwoColumnSection from '../__sections/two-column';
import type { Config, Data } from '@puckeditor/core';
import { normalizePuckData } from '../__utils/normalize-puck-data';
import { useUpdatePage } from '@/lib/hooks/page/page.hook';
import useGeneralStore from '@/lib/store/generalStore';
import { useTranslations } from 'next-intl';

export const config = {
  categories: {
    Header: {
      title: 'Layout',
      components: ['Header', 'Footer', 'Divider', 'Spacer'],
    },
    Hero: {
      title: 'Hero Sections',
      components: ['HeroSection', 'HeroWithVideo'],
    },
    Content: {
      title: 'Content',
      components: ['TextBlock', 'TwoColumn', 'Quote', 'Image', 'GallerySection', 'Video'],
    },
    Features: {
      title: 'Features & Stats',
      components: ['FeatureGrid', 'FeatureCards', 'StatsSection', 'LogoCloud'],
    },
    Courses: {
      title: 'Courses & Team',
      components: ['CourseShowcase', 'InstructorSection', 'TeamSection', 'Timeline'],
    },
    Conversion: {
      title: 'Conversion',
      components: [
        'CTASection',
        'PricingSection',
        'Countdown',
        'NewsLetter',
        'ContactForm',
        'Button',
      ],
    },
    Misc: {
      title: 'Social Proof & Misc',
      components: ['TestimonialSection', 'FAQSection', 'BlogSection', 'Alert'],
    },
  },

  components: {
    Header: HeaderSection(),
    HeroSection: HeroSection(),
    HeroWithVideo: HeroWithVideo(),
    FeatureGrid: FeaturedGridSection(),
    FeatureCards: FeatureCardsSection(),
    CourseShowcase: CourseShowcase(),
    StatsSection: StatsSection(),
    TestimonialSection: TestimonialSection(),
    CTASection: CTASection(),
    FAQSection: FAQSection(),
    Footer: FooterSection(),
    InstructorSection: InstructorSection(),
    BlogSection: BlogSection(),
    Timeline: TimelineSection(),
    TeamSection: TeamSection(),
    LogoCloud: LogoCloudSection(),
    Image: ImageSection(),
    NewsLetter: NewsLetterSection(),
    PricingSection: PricingSection(),
    Button: ButtonSection(),
    Divider: DividerSection(),
    Spacer: SpacerSection(),
    Video: VideoSection(),
    GallerySection: GallerySection(),
    ContactForm: ContactFormSection(),
    Countdown: CountdownSection(),
    Alert: AlertSection(),
    Quote: QuoteSection(),
    TextBlock: TextBlockSection(),
    TwoColumn: TwoColumnSection(),
  },
};

interface PuckEditorProps {
  /** Page slug from the route — passed from the server page so save targets the correct document. */
  slug: string;
  initialData?: Data;
}

export default function PuckEditor({ slug, initialData }: PuckEditorProps) {
  const t = useTranslations('PuckEditor');
  const updatePage = useUpdatePage();

  const defaultInitialData = useMemo(
    () => ({
      content: [],
      root: { props: { title: t('myLandingPage') } },
    }),
    [t]
  );

  const data = useMemo(
    () => normalizePuckData(initialData ?? defaultInitialData),
    [initialData, defaultInitialData]
  );

  const save = async (pageData: Data) => {
    useGeneralStore.setState({ generalIsLoading: true });
    try {
      await updatePage.mutateAsync({ slug, pageData });
    } finally {
      useGeneralStore.setState({ generalIsLoading: false });
    }
  };
  return (
    <Puck
      config={config as unknown as Config}
      data={data}
      onPublish={(pageData) => {
        void save(pageData);
      }}
    />
  );
}
