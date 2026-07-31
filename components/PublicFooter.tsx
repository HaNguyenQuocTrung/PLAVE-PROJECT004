import Image from "next/image";
import Link from "next/link";

import { getHeaderLogoHref } from "@/lib/auth/navigation";
import { getPublicAuthState } from "@/lib/auth/public-state";

export async function PublicFooter() {
  const authState = await getPublicAuthState();
  const homeHref = getHeaderLogoHref(
    authState.authenticated,
    authState.onboardingCompleted,
    authState.role,
  );

  return (
    <footer className="site-footer">
      <div>
        <Link className="brand brand--small" href={homeHref}>
          <Image
            src="/brand/plave-logo-header.png"
            alt="PLAVE – Personalized Learning App for Vietnam Education"
            width={150}
            height={43}
          />
        </Link>
        <p>Học Toán theo nhịp riêng — rõ ràng, an toàn và vừa sức.</p>
      </div>
      <nav aria-label="Thông tin">
        {authState.authenticated && authState.onboardingCompleted ? (
          <>
            <Link
              href={
                authState.role === "TEACHER" ? "/teacher" : "/dashboard"
              }
            >
              Tổng quan
            </Link>
            {authState.role === "STUDENT" ? (
              <>
                <Link href="/lessons">Bài học</Link>
                <Link href="/goals">Mục tiêu</Link>
              </>
            ) : null}
            <Link href="/privacy">Quyền riêng tư</Link>
          </>
        ) : authState.authenticated ? (
          <>
            <Link
              href={
                authState.role === "TEACHER"
                  ? "/teacher/onboarding"
                  : "/onboarding"
              }
            >
              {authState.role === "TEACHER"
                ? "Xác minh giáo viên"
                : "Hoàn tất hồ sơ"}
            </Link>
            <Link href="/privacy">Quyền riêng tư</Link>
          </>
        ) : (
          <>
            <Link href="/about">Giới thiệu</Link>
            <Link href="/terms">Điều khoản</Link>
            <Link href="/privacy">Quyền riêng tư</Link>
          </>
        )}
      </nav>
    </footer>
  );
}
