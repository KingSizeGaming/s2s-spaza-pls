'use client';
import Image from 'next/image';

export default function Logo() {
  return (
    <div className="w-56 h-28 flex items-center justify-center px-5">
      <Image src="/images/logo2.png" alt="Weekly Soccer Picks" width={320} height={120} className="w-full" />
    </div>
  );
}
