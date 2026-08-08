import {
  assertOwnerLocalDemoPreflight,
  assertOwnerLocalSetupPreflight,
  readOwnerLocalManagedState,
} from "./owner-local-demo-support.ts";

if (readOwnerLocalManagedState().present) {
  await assertOwnerLocalDemoPreflight();
} else {
  assertOwnerLocalSetupPreflight();
}
