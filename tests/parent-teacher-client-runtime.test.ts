import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CLIENT_REQUEST_TIMEOUT_MS,
  ClientRequestTimeoutError,
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "../lib/http/client-request.ts";

const clientJourneyFiles = [
  "../components/ConnectionsManager.tsx",
  "../components/TeacherClassroomsManager.tsx",
  "../components/StudentClassroomsManager.tsx",
  "../components/ClassroomRosterManager.tsx",
  "../components/TeacherCurriculumAssignmentBuilder.tsx",
  "../components/TeacherAssignmentPublisher.tsx",
  "../components/TeacherQuestionLibraryManager.tsx",
  "../components/TeacherAssignmentLifecycleManager.tsx",
  "../components/AssignmentRunner.tsx",
  "../app/teacher/onboarding/TeacherOnboardingForm.tsx",
] as const;

test("Parent and Teacher client journeys have bounded requests", () => {
  assert.equal(CLIENT_REQUEST_TIMEOUT_MS, 8_000);
  for (const path of clientJourneyFiles) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /fetchWithClientTimeout/);
    assert.doesNotMatch(source, /await fetch\(/);
  }
});

test("client timeout becomes a safe retry message with a public code", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    })) as typeof fetch;

  try {
    await assert.rejects(
      fetchWithClientTimeout("/never", {}, 5),
      ClientRequestTimeoutError,
    );
    const message = getClientRequestErrorMessage(
      new ClientRequestTimeoutError(),
      "TEACHER_ASSIGNMENT_TIMEOUT",
      "fallback",
    );
    assert.match(message, /TEACHER_ASSIGNMENT_TIMEOUT/);
    assert.match(message, /thử lại/);
    assert.doesNotMatch(
      message,
      /@|[0-9a-f]{8}-[0-9a-f]{4}|token|key/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
