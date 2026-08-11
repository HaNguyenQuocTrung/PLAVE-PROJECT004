import test from "node:test";
import assert from "node:assert/strict";
import { auditWaveLCredentialSafe, auditWaveLCredentialSource, verifyWaveLCredentialAuditImplementation } from "../lib/content-factory/wave-l-credential-safe.ts";
import { auditWaveLInvocationBoundary } from "../lib/content-factory/wave-l-invocation.ts";

test("Wave L credential audit uses a sanitized disposable tracked-file workspace", () => {
  const result = auditWaveLCredentialSafe();
  assert.equal(result.status, "PASS"); assert.equal(result.realEnvironmentFilesOpened, 0); assert.equal(result.credentialValueReads, 0);
  assert.equal(result.credentialValuesPrintedHashedMeasuredOrCompared, 0); assert.deepEqual(result.providerEnvironmentVariablesInherited, []);
  assert.deepEqual(result.copiedIgnoredSecretFiles, []); assert.equal(result.environmentLogged, false);
  assert.deepEqual(result.syntheticFixture.detections.sort(), ["CREDENTIAL_ENV_VALUE_READ_FORBIDDEN", "REAL_ENV_FILE_OPEN_FORBIDDEN"]);
  assert.equal(result.waveFIncidentPreserved, true); assert.equal(result.waveKIncidentPreserved, true);
});

test("Wave L regression guard rejects both historical credential-read causes synthetically", () => {
  const envRead = `${"process."}${"env."}${"GOOGLE_API_KEY"}`;
  const localFileRead = `${"readFileSync"}('${".env."}${"local"}')`;
  assert.deepEqual(auditWaveLCredentialSource("synthetic-env-read.ts", envRead).map((row) => row.code), ["CREDENTIAL_ENV_VALUE_READ_FORBIDDEN"]);
  assert.deepEqual(auditWaveLCredentialSource("synthetic-local-file-read.ts", localFileRead).map((row) => row.code), ["REAL_ENV_FILE_OPEN_FORBIDDEN"]);
  assert.deepEqual(verifyWaveLCredentialAuditImplementation(), { implementationIsFile: true, implementationExecutable: false,
    opensRealEnvironmentFile: false, readsCredentialEnvironmentValue: false, inheritsRealEnvironment: false, logsEnvironment: false });
});

test("Wave L offline invocation has zero new boundary incidents", () => {
  const result = auditWaveLInvocationBoundary(); assert.equal(result.status, "PASS"); assert.equal(result.bareNpxInvocations, 0);
  assert.equal(result.networkCapableNpmInvocations, 0); assert.equal(result.waveLNetworkAttemptCount, 0);
  assert.equal(result.waveLCredentialReadCount, 0); assert.equal(result.waveLOperationalIncidentCount, 0);
  assert.equal(result.waveFIncidentPreserved, true); assert.equal(result.waveKIncidentPreserved, true);
});
