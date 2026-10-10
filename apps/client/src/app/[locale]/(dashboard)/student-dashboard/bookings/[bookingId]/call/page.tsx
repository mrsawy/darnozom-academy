import BookingCallView from './__components/booking-call-view';

interface BookingCallPageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function BookingCallPage({ params }: BookingCallPageProps) {
  const { bookingId } = await params;
  return <BookingCallView bookingId={bookingId} />;
}
