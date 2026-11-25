import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPartnerBrand, PARTNER_LOGO_BUCKET, PARTNER_LOGO_URL_SECONDS } from "../../src/lib/partner-brand";

/**
 * The brand of the partner page (#1254), from the public read of the contract
 * `tuggi-do-parceiro.md` §2 and the private bucket of §3. BR-B2B-070 item 2:
 * only the approved logo, and no brand at all without it. DS-MARCA-002: the
 * colour travels as the server's pair or not at all.
 */

type Row = { logo_path: string | null; brand_color: string | null; brand_ink: string | null };

function double(answer: { data?: Row[] | null; error?: { code: string; message: string } | null }, signError = false) {
  const calls: { schema?: string; fn?: string; args?: unknown; bucket?: string; path?: string; ttl?: number } = {};
  const client = {
    schema(name: string) {
      calls.schema = name;
      return {
        rpc: async (fn: string, args: unknown) => {
          calls.fn = fn;
          calls.args = args;
          return { data: answer.data ?? null, error: answer.error ?? null };
        },
      };
    },
    storage: {
      from(bucket: string) {
        calls.bucket = bucket;
        return {
          createSignedUrl: async (path: string, ttl: number) => {
            calls.path = path;
            calls.ttl = ttl;
            return signError
              ? { data: null, error: { message: "Object not found" } }
              : { data: { signedUrl: `https://x.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=t` }, error: null };
          },
        };
      },
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

test.describe("fetchPartnerBrand", () => {
  test("BR-B2B-070 item 2: a partner with the approved logo gets its signed URL, by the @, from the public read", async () => {
    const { client, calls } = double({ data: [{ logo_path: "c1/u1.png", brand_color: null, brand_ink: null }] });
    const brand = await fetchPartnerBrand(client, "hotel-mar-azul");
    expect(brand).toEqual({ logoUrl: "https://x.supabase.co/storage/v1/object/sign/partner-logos/c1/u1.png?token=t", color: null });
    expect(calls).toMatchObject({
      schema: "drive",
      fn: "resolve_partner_brand_public_v1",
      args: { p_input: "hotel-mar-azul" },
      bucket: PARTNER_LOGO_BUCKET,
      path: "c1/u1.png",
      ttl: PARTNER_LOGO_URL_SECONDS,
    });
  });

  test("BR-B2B-070 item 2: zero rows, no brand: the page shows the name alone", async () => {
    const { client, calls } = double({ data: [] });
    expect(await fetchPartnerBrand(client, "sem-marca")).toBeNull();
    expect(calls.bucket).toBeUndefined();
  });

  test("DS-MARCA-002: the colour is the server's pair, and half a pair is no colour", async () => {
    const both = double({ data: [{ logo_path: "c1/u1.png", brand_color: "#0F5A6B", brand_ink: "#FFFFFF" }] });
    expect((await fetchPartnerBrand(both.client, "a"))?.color).toEqual({ background: "#0F5A6B", ink: "#FFFFFF" });
    const half = double({ data: [{ logo_path: "c1/u1.png", brand_color: "#0F5A6B", brand_ink: null }] });
    expect((await fetchPartnerBrand(half.client, "a"))?.color).toBeNull();
  });

  test("the rate limit or a refused signature fails soft, as no brand", async () => {
    const limited = double({ error: { code: "TGB70", message: "rate limit" } });
    expect(await fetchPartnerBrand(limited.client, "a")).toBeNull();
    const unsigned = double({ data: [{ logo_path: "c1/u1.png", brand_color: null, brand_ink: null }] }, true);
    expect(await fetchPartnerBrand(unsigned.client, "a")).toBeNull();
  });

  test("the signed URL outlives the page's 5-minute read by a wide margin", () => {
    expect(PARTNER_LOGO_URL_SECONDS).toBeGreaterThanOrEqual(12 * 300);
  });
});
