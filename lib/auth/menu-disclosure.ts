export type MenuDisclosureContext = Readonly<{
  authenticated: boolean;
  pathname: string;
}>;

export type MenuDisclosureState = Readonly<{
  context: MenuDisclosureContext;
  open: boolean;
}>;

export function createMenuDisclosureContext(
  authenticated: boolean,
  pathname: string,
): MenuDisclosureContext {
  return { authenticated, pathname };
}

export function createMenuDisclosureState(
  context: MenuDisclosureContext,
  open = false,
): MenuDisclosureState {
  return { context, open };
}

export function isMenuDisclosureOpen(
  state: MenuDisclosureState,
  context: MenuDisclosureContext,
) {
  return state.open && state.context === context;
}
