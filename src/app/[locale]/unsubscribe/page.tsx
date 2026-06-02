import crypto from "crypto";
import { setRequestLocale } from "next-intl/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: "Unsubscribe", robots: { index: false, follow: false } };
}

// Verifica a assinatura HMAC stateless gerada pela Edge Function send-newsletter
// do CMS (HMAC-SHA256 do email, base64url sem padding). O segredo NEWSLETTER_SECRET
// precisa ser o MESMO configurado na Edge Function.
function verify(emailB64: string, sig: string, secret: string): string | null {
  try {
    const email = Buffer.from(emailB64, "base64url").toString("utf8");
    const expected = crypto.createHmac("sha256", secret).update(email).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return email;
  } catch {
    return null;
  }
}

const COPY: Record<string, { okTitle: string; okBody: string; errTitle: string; errBody: string }> = {
  pt: {
    okTitle: "Inscrição cancelada",
    okBody: "Você não receberá mais nossos emails. Sentiremos sua falta!",
    errTitle: "Link inválido",
    errBody: "Não foi possível processar o cancelamento. O link pode ter expirado.",
  },
  es: {
    okTitle: "Suscripción cancelada",
    okBody: "Ya no recibirás nuestros emails. ¡Te echaremos de menos!",
    errTitle: "Enlace inválido",
    errBody: "No pudimos procesar tu solicitud. El enlace puede haber caducado.",
  },
  en: {
    okTitle: "Unsubscribed",
    okBody: "You will not receive our emails anymore. We will miss you!",
    errTitle: "Invalid link",
    errBody: "We could not process your request. The link may have expired.",
  },
};

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ e?: string; s?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { e, s } = await searchParams;
  const secret = process.env.NEWSLETTER_SECRET || "";
  const lang = locale.startsWith("pt") ? "pt" : locale.startsWith("es") ? "es" : "en";
  const copy = COPY[lang];

  let ok = false;
  if (e && s && secret) {
    const email = verify(e, s, secret);
    if (email) {
      const supabase = getSupabaseServer();
      const { error } = await supabase
        .schema("marketing")
        .from("email_unsubscribes")
        .upsert({ email, source: "footer_link" }, { onConflict: "email", ignoreDuplicates: true });
      ok = !error;
    }
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{ok ? copy.okTitle : copy.errTitle}</h1>
        <p className="mt-3 text-sm text-gray-600">{ok ? copy.okBody : copy.errBody}</p>
      </div>
    </main>
  );
}
