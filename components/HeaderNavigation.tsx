"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LogoutForm } from "@/components/LogoutForm";
import { getNavigationIcon, PlaveIcon } from "@/components/PlaveIcon";
import {
  getProfileMenuActions,
  isHeaderItemActive,
  type HeaderNavigationItem,
  type HeaderRole,
} from "@/lib/auth/navigation";
import {
  createMenuDisclosureContext,
  createMenuDisclosureState,
  isMenuDisclosureOpen,
} from "@/lib/auth/menu-disclosure";

type HeaderNavigationProps = {
  authenticated: boolean;
  role: HeaderRole;
  fullName: string | null;
  grade: number | null;
  onboardingCompleted: boolean;
  navigation: HeaderNavigationItem[];
};

export function HeaderNavigation({
  authenticated,
  role,
  fullName,
  grade,
  onboardingCompleted,
  navigation,
}: HeaderNavigationProps) {
  const pathname = usePathname();
  const disclosureContext = useMemo(
    () => createMenuDisclosureContext(authenticated, pathname),
    [authenticated, pathname],
  );
  const [menuState, setMenuState] = useState(() =>
    createMenuDisclosureState(disclosureContext),
  );
  const menuOpen = isMenuDisclosureOpen(menuState, disclosureContext);
  const [profileMenuState, setProfileMenuState] = useState(() =>
    createMenuDisclosureState(disclosureContext),
  );
  const profileMenuOpen = isMenuDisclosureOpen(
    profileMenuState,
    disclosureContext,
  );
  const profileAreaRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationPanelRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const setMenuOpen = useCallback((open: boolean) => {
    setMenuState(createMenuDisclosureState(disclosureContext, open));
  }, [disclosureContext]);
  const setProfileMenuOpen = useCallback((open: boolean) => {
    setProfileMenuState(
      createMenuDisclosureState(disclosureContext, open),
    );
  }, [disclosureContext]);

  useEffect(() => {
    if (!menuOpen && !profileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (profileMenuOpen) {
          setProfileMenuOpen(false);
          profileButtonRef.current?.focus();
        } else {
          setMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen, profileMenuOpen, setMenuOpen, setProfileMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    window.requestAnimationFrame(() => {
      navigationPanelRef.current
        ?.querySelector<HTMLElement>("a, button:not([disabled])")
        ?.focus();
    });

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !navigationPanelRef.current?.contains(event.target) &&
        !menuButtonRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [menuOpen, setMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !profileAreaRef.current?.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [profileMenuOpen, setProfileMenuOpen]);

  const userLabel =
    fullName?.trim() ||
    (role === "STUDENT"
      ? "Học sinh"
      : role === "PARENT"
        ? "Phụ huynh"
        : role === "TEACHER"
          ? "Giáo viên"
          : "Tài khoản");
  const nameParts = userLabel.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.charAt(0) ?? "P";
  const lastInitial =
    nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : "";
  const userInitials = `${firstInitial}${lastInitial}`.toLocaleUpperCase("vi");
  const profileMenuActions = getProfileMenuActions(role);

  const focusProfileMenuItem = (position: "first" | "last") => {
    window.requestAnimationFrame(() => {
      const items = profileMenuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      if (!items?.length) return;
      items[position === "first" ? 0 : items.length - 1]?.focus();
    });
  };

  const openProfileMenu = (focus: "first" | "last" | null = null) => {
    setProfileMenuOpen(true);
    if (focus) focusProfileMenuItem(focus);
  };

  const handleProfileButtonKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openProfileMenu("first");
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      openProfileMenu("last");
    }
  };

  const handleProfileMenuKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Tab") {
      setProfileMenuOpen(false);
      return;
    }

    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const items = Array.from(
      profileMenuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );
    if (!items.length) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Home") {
      items[0]?.focus();
    } else if (event.key === "End") {
      items.at(-1)?.focus();
    } else {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : items.length - 1
          : (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    }
  };

  const closeAllMenus = () => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
  };

  if (authenticated && !onboardingCompleted) {
    return (
      <div className="onboarding-account">
        <span className="profile-avatar" aria-hidden="true">
          {userInitials}
        </span>
        <span className="site-user-area__identity">
          <strong>{userLabel}</strong>
          <span>
            {role === "TEACHER"
              ? "Đang xác minh giáo viên"
              : "Đang hoàn tất hồ sơ"}
          </span>
        </span>
        <LogoutForm
          buttonClassName="onboarding-account__logout"
          buttonVariant="secondary"
        />
      </div>
    );
  }

  return (
    <>
      <button
        ref={menuButtonRef}
        className="site-menu-toggle"
        id="site-menu-toggle"
        type="button"
        aria-label={menuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
        aria-controls="site-navigation-panel"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span
          aria-hidden="true"
          className={`site-menu-toggle__icon ${
            menuOpen ? "site-menu-toggle__icon--open" : ""
          }`}
        >
          <span />
          <span />
          <span />
        </span>
        <span>Trình đơn</span>
      </button>

      <div
        ref={navigationPanelRef}
        className={`site-navigation-panel ${
          menuOpen ? "site-navigation-panel--open" : ""
        }`}
        id="site-navigation-panel"
      >
        <nav className="site-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => {
            const active = isHeaderItemActive(pathname, item);
            if (item.disabled) {
              return (
                <span
                  className="site-nav__disabled"
                  key={item.href}
                  aria-disabled="true"
                >
                  {authenticated ? <PlaveIcon name={getNavigationIcon(item.href)} /> : null}
                  <span>{item.label}</span>
                  {item.badge ? <small>{item.badge}</small> : null}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {authenticated ? <PlaveIcon name={getNavigationIcon(item.href)} /> : null}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {authenticated ? (
          <div className="site-user-area" ref={profileAreaRef}>
            <button
              className="profile-menu-trigger"
              id="profile-menu-trigger"
              ref={profileButtonRef}
              type="button"
              aria-label={`Mở menu tài khoản của ${userLabel}`}
              aria-controls="profile-menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              onKeyDown={handleProfileButtonKeyDown}
            >
              <span className="profile-avatar" aria-hidden="true">
                {userInitials}
              </span>
              <span className="site-user-area__identity">
                <strong>{userLabel}</strong>
                <span>
                  {role === "STUDENT" && grade
                    ? `Lớp ${grade}`
                    : role === "PARENT"
                      ? "Phụ huynh"
                      : role === "TEACHER"
                        ? "Giáo viên đã xác minh"
                        : "Tài khoản PLAVE"}
                </span>
              </span>
              <span className="profile-menu-trigger__chevron" aria-hidden="true" />
            </button>

            {profileMenuOpen ? (
              <div
                className="profile-menu"
                id="profile-menu"
                ref={profileMenuRef}
                role="menu"
                aria-labelledby="profile-menu-trigger"
                onKeyDown={handleProfileMenuKeyDown}
              >
                {profileMenuActions.map((action) => (
                  <Link
                    href={action.href}
                    key={action.href}
                    role="menuitem"
                    onClick={closeAllMenus}
                  >
                    {action.label}
                  </Link>
                ))}
                <LogoutForm
                  buttonClassName="profile-menu__logout"
                  menuItem
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
