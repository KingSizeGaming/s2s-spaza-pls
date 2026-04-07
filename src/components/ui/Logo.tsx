'use client';
import Image from 'next/image';
// import SideMenu from '@/components/ui/SideMenu';

export default function Logo() {
  return (
    <div className="relative py-4 flex items-center justify-center w-full">
      {/* <SideMenu /> */}
      <Image
        src="/images/wkw_logo.png"
        alt="Wina Kasi Wina"
        width={500}
        height={500}
        sizes="(max-width: 640px) 200px, 250px"
        className="w-48 sm:w-56 md:w-64 h-auto mx-auto"
        loading="eager"
        priority
      />
    </div>
  );
}
