'use client';

import {useRouter} from 'next/navigation';
import ErrorModal from '@/components/modals/ErrorModal';

export default function EntriesErrorModal({message, backHref}: {message: string; backHref: string}) {
  const router = useRouter();
  return <ErrorModal title="Access Denied" message={message} onClose={() => router.push(backHref)} />;
}
