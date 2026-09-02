import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/sem-permissao"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Portal do colaborador (pesquisa psicossocial) — UI pública.
  if (pathname === "/avaliacao" || pathname.startsWith("/avaliacao/")) {
    return true;
  }
  // Rota efêmera de impressão PDF (protegida por token HMAC).
  if (pathname.startsWith("/riscos-relatorio-print/")) {
    return true;
  }
  // APIs públicas de validação/sessão do portal do colaborador.
  if (
    pathname === "/api/avaliacao" ||
    pathname.startsWith("/api/avaliacao/")
  ) {
    return true;
  }
  return false;
}

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    if (!cookie.name.includes("auth-token")) return false;
    const value = cookie.value?.trim();
    return Boolean(value && value !== "null" && value !== "{}" && value !== "[]");
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasSupabaseSession(request);

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
