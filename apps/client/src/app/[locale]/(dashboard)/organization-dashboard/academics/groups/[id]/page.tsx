'use client';

import { useParams } from 'next/navigation';
import { GroupFormationScreen } from './__components/group-formation-screen';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  return <GroupFormationScreen groupId={id} />;
}
