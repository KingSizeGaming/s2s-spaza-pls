'use client';
import Image from 'next/image';
// import SideMenu from '@/components/ui/SideMenu';

export default function Logo() {
  return (
    <div className="relative pt-4 flex items-center justify-center w-full">
      {/* <SideMenu /> */}
      <Image
        src="/images/wkw_logo.png"
        alt="Wina Kasi Wina"
        width={500}
        height={500}
        sizes="(max-width: 250px) 100vw, 250px"
        className="w-3xs h-auto mx-auto"
        highPriority="true"
      />
    </div>
  );
}
