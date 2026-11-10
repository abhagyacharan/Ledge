import { APP_NAME } from "@/config/app";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight">{APP_NAME}</p>
        {children}
      </div>
    </main>
  );
}
