import Image from "next/image";
import Link from "next/link";

import { HeaderNavigation } from "@/components/HeaderNavigation";
import {
  getHeaderLogoHref,
  getHeaderNavigation,
} from "@/lib/auth/navigation";
import { getPublicAuthState } from "@/lib/auth/public-state";

export async function PublicHeader() {
  const authState = await getPublicAuthState();
  const navigation = getHeaderNavigation(
    authState.authenticated,
    authState.role,
    authState.onboardingCompleted,
  );
  const logoHref = getHeaderLogoHref(
    authState.authenticated,
    authState.onboardingCompleted,
    authState.role,
  );

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link
          className="brand"
          href={logoHref}
          aria-label={
            authState.authenticated && authState.onboardingCompleted
              ? authState.role === "TEACHER"
                ? "PLAVE — Tổng quan giáo viên"
                : "PLAVE — Dashboard học tập"
              : authState.authenticated
                ? authState.role === "TEACHER"
                  ? "PLAVE — Xác minh giáo viên"
                  : "PLAVE — Hoàn tất hồ sơ"
                : "PLAVE — Trang chủ"
          }
        >
          <Image
            src="/brand/plave-logo-header.png"
            alt="PLAVE – Personalized Learning App for Vietnam Education"
            width={210}
            height={60}
            priority
          />
        </Link>
        <HeaderNavigation
          authenticated={authState.authenticated}
          role={authState.role}
          fullName={authState.fullName}
          grade={authState.grade}
          onboardingCompleted={authState.onboardingCompleted}
          navigation={navigation}
        />
      </div>
    </header>
  );
}
