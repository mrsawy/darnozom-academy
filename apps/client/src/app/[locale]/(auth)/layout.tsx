import HomeNave from '@/components/organs/home-nav';

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeNave />
      {children}
    </>
  );
}
