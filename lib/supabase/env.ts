type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Thiếu cấu hình Supabase công khai. Hãy kiểm tra các biến môi trường bắt buộc.",
    );
  }

  try {
    const parsedUrl = new URL(url);
    const isSecureRemote = parsedUrl.protocol === "https:";
    const isLoopbackHttp =
      parsedUrl.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname);
    if (!isSecureRemote && !isLoopbackHttp) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error(
      "Cấu hình URL Supabase không hợp lệ. Hãy kiểm tra biến môi trường.",
    );
  }

  return { url, publishableKey };
}
