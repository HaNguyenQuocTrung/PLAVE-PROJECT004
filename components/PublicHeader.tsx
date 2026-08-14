import Image from "next/image";
import Link from "next/link";

import { HeaderNavigation } from "@/components/HeaderNavigation";
import { getAiTutorPublicAvailability } from "@/lib/ai-tutor/config";
import {
  getHeaderLogoHref,
  getHeaderNavigation,
} from "@/lib/auth/navigation";
import { getPublicAuthState } from "@/lib/auth/public-state";

export async function PublicHeader() {
  const authState = await getPublicAuthState();
  const aiTutorAvailability = getAiTutorPublicAvailability();
  const navigation = getHeaderNavigation(
    authState.authenticated,
    authState.role,
    authState.onboardingCompleted,
    aiTutorAvailability.available,
  );
  const logoHref = getHeaderLogoHref(
    authState.authenticated,
    authState.onboardingCompleted,
    authState.role,
  );

  return (
    <header
      className={`site-header ${
        authState.authenticated ? "site-header--application" : "site-header--public"
      }`}
      data-role={authState.role?.toLowerCase() ?? "public"}
    >
      <div className="site-header__inner">
        <Link
          className="brand"
          href={logoHref}
          aria-label={
            authState.authenticated && authState.onboardingCompleted
              ? authState.role === "TEACHER"
                ? "PLAVE — Tổng quan giáo viên"
                : "PLAVE — Tổng quan học tập"
              : authState.authenticated
                ? authState.role === "TEACHER"
                  ? "PLAVE — Xác minh giáo viên"
                  : "PLAVE — Hoàn tất hồ sơ"
                : "PLAVE — Trang chủ"
          }
        >
          <Image
            src="/brand/plave-logo-header.png"
            alt="PLAVE"
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
      {authState.authNotice ? (
        <p className="auth-session-notice" role="status">
          {authState.authNotice === "RECOVERED"
            ? "Phiên đăng nhập cũ không còn hợp lệ và đã được dọn dẹp an toàn."
            : "Tạm thời chưa thể xác minh đăng nhập. Nội dung công khai vẫn sử dụng được; hãy thử lại sau."}
        </p>
      ) : null}
    </header>
  );
}
