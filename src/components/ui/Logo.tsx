'use client';
import Image from 'next/image';
// import SideMenu from '@/components/ui/SideMenu';

export default function Logo() {
  return (
    <div className="relative py-5 flex items-center justify-center w-full">
      {/* <SideMenu /> */}
      <Image src="/images/logo2.webp" alt="Wina Kasi Wina" width={350} height={200} className="w-full" />
    </div>
  );
}
