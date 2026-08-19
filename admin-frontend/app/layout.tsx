import type { Metadata } from "next";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "RAG Desk Admin",
  description: "Admin dashboard for RAG Desk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>
          <AuthProvider>{children}</AuthProvider>
        </Provider>
      </body>
    </html>
  );
}
