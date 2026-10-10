import LiveCallView from './__components/live-call-view';

interface LiveCallPageProps {
  params: Promise<{ id: string; contentId: string }>;
}

export default async function LiveCallPage({ params }: LiveCallPageProps) {
  const { id: enrollmentId, contentId } = await params;
  return <LiveCallView enrollmentId={enrollmentId} contentId={contentId} />;
}
