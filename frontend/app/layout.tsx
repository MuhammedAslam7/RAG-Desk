// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RAG Desk - AI Support",
  description: "Intelligent AI customer support powered by knowledge base",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <body className="h-full bg-background text-foreground antialiased flex flex-col">
          {/* No-flash theme script — applies the saved theme before first paint */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{if(location.pathname.indexOf("/widget")===0){document.documentElement.classList.add("dark");return}var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.add("light")}else{document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
            }}
          />
          {children}
          <ThemeToggle />
        </body>
      </html>
    </ClerkProvider>
  );
}