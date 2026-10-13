import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-sm">
        <Image
          src="/brand/logo-full.png"
          alt="Fine Line Process — Smart processes. Stronger results."
          width={640}
          height={432}
          priority
          className="mx-auto mb-8 h-auto w-64"
        />
        {children}
      </div>
    </div>
  );
}
