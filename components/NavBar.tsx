"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/extraer", label: "Extraer" },
  { href: "/unificar", label: "Unificar" },
  { href: "/predicciones", label: "Predicciones" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 px-6 py-4">
      <nav className="glass mx-auto flex max-w-3xl items-center justify-between rounded-full px-5 py-2.5">
        <Link href="/" className="text-sm font-semibold text-gradient">
          Predicción Mundial
        </Link>
        <div className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
