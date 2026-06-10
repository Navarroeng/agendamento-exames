import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, SEM_PERMISSAO_PATH } from "@/lib/perfil-access";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";
  const isSemPermissao = pathname === SEM_PERMISSAO_PATH;
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/e-social") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/clinicas") ||
    pathname.startsWith("/exames") ||
    pathname.startsWith("/usuarios") ||
    pathname.startsWith("/faturas") ||
    pathname.startsWith("/faturas-clientes") ||
    pathname.startsWith("/custos-clinicas") ||
    pathname.startsWith("/relatorios") ||
    pathname.startsWith("/periodicos-futuros") ||
    pathname.startsWith("/cargos") ||
    pathname.startsWith("/configuracoes") ||
    isSemPermissao;

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isProtected && !isSemPermissao) {
    const { data: perfilRow } = await supabase
      .from("perfis_usuarios")
      .select("perfil")
      .eq("user_id", user.id)
      .maybeSingle();

    const perfil = perfilRow?.perfil ?? null;

    if (!canAccessPath(perfil, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = SEM_PERMISSAO_PATH;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
