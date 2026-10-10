import HomeNave from '@/components/organs/home-nav';

/**
 * The org-verification gate is a standalone route (outside the home/auth groups),
 * so it needs its own navbar to stay consistent with the rest of the site. HomeNave
 * reads the persisted user store, so a logged-in org sees its account menu here.
 * Auth CTAs are hidden — users on this flow are already mid-signup.
 */
export default function OrganizationVerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HomeNave hideAuthButtons />
      {children}
    </>
  );
}
