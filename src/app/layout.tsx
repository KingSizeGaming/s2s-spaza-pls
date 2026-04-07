import type { Metadata } from "next";
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "Wina Kasi Wina",
  icons: {
    icon: "/images/wkw_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/images/exit_button_tapped.png" as="image" />
        <link rel="preload" href="/images/no_button_tapped.png" as="image" />
        <link rel="preload" href="/images/yes_button_tapped.png" as="image" />
        <link rel="preload" href="/images/submit_button_tapped.png" as="image" />
        <link rel="preload" href="/images/back_button_tapped.png" as="image" />
        <link rel="preload" href="/images/home_button_picked.png" as="image" />
        <link rel="preload" href="/images/draw_button_picked.png" as="image" />
        <link rel="preload" href="/images/away_button_picked.png" as="image" />
        <link rel="preload" href="/images/home_button_untapped.png" as="image" />
        <link rel="preload" href="/images/draw_button_untapped.png" as="image" />
        <link rel="preload" href="/images/away_button_untapped.png" as="image" />
      </head>
      <body className="antialiased">
        {/* <div className="bg-amber-100 text-amber-900">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 text-sm">
            <span>
              POC Demo: WhatsApp is simulated. Flow and logic represent BSP
              integration.
            </span>
          </div>
        </div> */}
        {children}
      </body>
    </html>
  );
}
