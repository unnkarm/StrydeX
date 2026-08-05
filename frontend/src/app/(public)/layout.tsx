import PublicNav from "@/components/PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
