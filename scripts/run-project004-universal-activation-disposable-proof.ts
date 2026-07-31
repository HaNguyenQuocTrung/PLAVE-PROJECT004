import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  disposableProofStageTimeoutMs,
  type DisposableProofStage,
} from "./project004-disposable-proof-lifecycle.ts";
import {
  buildProject004UniversalActivationPreflightSql,
  buildProject004UniversalActivationSql,
  buildProject004UniversalDeactivationSql,
  parseProject004UniversalActivationPreflight,
  project004UniversalActivationContract,
  verifyProject004UniversalActivationCounts,
} from "./project004-remote-universal-activation.ts";
import {
  renderDisposableProof,
  runDisposablePsql,
  runProject004CleanDisposableProof,
  type CleanDisposableProofExtensionContext,
} from "./run-project004-clean-disposable-proof.ts";
import {
  buildProject004UniversalActivationPsqlInvocation,
  parseProject004UniversalActivationResponse,
} from "./project004-universal-activation-execution.ts";

type ActivationProofEvidence = {
  activationPreflight: "PASS" | "NOT_RUN";
  activationTransaction: "PASS" | "NOT_RUN";
  grade1LegacyFixedPractice: "PASS" | "NOT_RUN";
  grades2To9UniversalFixedPractice: "PASS" | "NOT_RUN";
  schoolGradeIsolation: "PASS" | "NOT_RUN";
  privateSolutionBoundary: "PASS" | "NOT_RUN";
  grade2AdaptivePilot: "DISABLED" | "NOT_RUN";
  deactivationTransaction: "PASS" | "NOT_RUN";
  boundAttemptResumePolicy: "PASS" | "NOT_RUN";
  finalReleaseState: "DRAFT/INACTIVE" | "NOT_RUN";
};

type ActivationProofFailure = Error & {
  cleanup?: "PASS" | "FAIL" | "NOT_STARTED";
};

const journeySentinel =
  "PROJECT004_UNIVERSAL_ACTIVATION_JOURNEY_V1|PASS";

function proofFailure(code: string): never {
  const error = new Error(code);
  error.name = "Project004UniversalActivationProofFailure";
  throw error;
}

async function runStage(
  context: CleanDisposableProofExtensionContext,
  stage: DisposableProofStage,
  sql: string,
  options?: {
    machineOutput?: boolean;
    sentinel?: string;
  },
) {
  context.lifecycle.begin(stage);
  const transactionInvocation = options?.sentinel
    ? buildProject004UniversalActivationPsqlInvocation(sql)
    : null;
  const result = await runDisposablePsql(
    context.ports,
    transactionInvocation?.input ?? sql,
    stage,
    context.lifecycle,
    context.abortSignal,
    disposableProofStageTimeoutMs[stage],
    options?.machineOutput ?? false,
    transactionInvocation?.args,
  );
  if (!result.childExited) {
    context.lifecycle.finish("FAIL");
    proofFailure(
      `DISPOSABLE_${stage}_CHILD_EXIT_UNCONFIRMED`,
    );
  }
  context.lifecycle.throwIfInterrupted();
  if (result.timedOut) {
    context.lifecycle.finish("TIMEOUT");
    proofFailure(`DISPOSABLE_STAGE_TIMEOUT_${stage}`);
  }
  const transactionResponse = options?.sentinel
    ? parseProject004UniversalActivationResponse(
        result,
        options.sentinel,
      )
    : null;
  if (
    !result.ok ||
    (transactionResponse !== null &&
      !transactionResponse.ok)
  ) {
    context.lifecycle.finish("FAIL");
    proofFailure(`DISPOSABLE_${stage}_FAILED`);
  }
  context.lifecycle.finish("PASS");
  return result;
}

function buildActivationJourneySql(root: string) {
  const syntheticUsers = readFileSync(
    resolve(
      root,
      "tests/fixtures/universal-curriculum-local-users.sql",
    ),
    "utf8",
  );
  return String.raw`
\set ON_ERROR_STOP on
begin;
${syntheticUsers}

do $journey$
declare
  v_grade integer;
  v_user_id uuid;
  v_unit_id text;
  v_other_unit_id text;
  v_state jsonb;
  v_resumed jsonb;
  v_attempt_id uuid;
  v_grade2_attempt_id uuid;
  v_grade2_unit_id text;
  v_question_id text;
  v_correct_answer text;
  v_revision integer;
  v_progress jsonb;
  v_legacy_units integer;
  v_legacy_questions integer;
  v_legacy_solutions integer;
begin
  select count(*) into v_legacy_units from public.learning_units;
  select count(*) into v_legacy_questions from public.questions;
  select count(*) into v_legacy_solutions
  from public.question_solutions;
  if
    v_legacy_units <> 14
    or v_legacy_questions <> 336
    or v_legacy_solutions <> 336
  then
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:LEGACY_BASELINE_DRIFT';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    '41000000-0000-4000-8000-000000000001',
    true
  );
  v_state := public.start_or_resume_practice(
    'grade-1-numbers-to-10'
  );
  v_attempt_id := (v_state ->> 'attempt_id')::uuid;
  v_question_id := v_state -> 'question_order' ->> 0;
  select solution.correct_answer into v_correct_answer
  from public.question_solutions as solution
  where solution.question_id = v_question_id;
  perform public.submit_practice_answer(
    v_attempt_id,
    v_question_id,
    v_correct_answer
  );
  v_progress := public.get_student_curriculum_progress();
  if
    v_progress ->> 'grade' <> '1'
    or v_progress ->> 'compatibility_mode'
      <> 'LEGACY_GRADE1_AGGREGATED'
  then
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:GRADE1_COMPATIBILITY_FAILED';
  end if;

  for v_grade in 2..9 loop
    v_user_id := format(
      '41000000-0000-4000-8000-%s',
      lpad(v_grade::text, 12, '0')
    )::uuid;
    perform set_config(
      'request.jwt.claim.sub',
      v_user_id::text,
      true
    );
    select unit.unit_id into v_unit_id
    from public.curriculum_release_units as unit
    where unit.release_id =
      '${project004UniversalActivationContract.releaseId}'
      and unit.grade = v_grade
    order by unit.display_order, unit.unit_id
    limit 1;
    v_state := public.start_or_resume_curriculum_unit(
      v_unit_id,
      extensions.gen_random_uuid()
    );
    v_attempt_id := (v_state ->> 'attempt_id')::uuid;
    if
      v_state ->> 'release_id'
        <> '${project004UniversalActivationContract.releaseId}'
      or v_state -> 'current_question' ? 'correct_answer'
      or v_state -> 'current_question' ? 'solution_steps'
      or v_state -> 'current_question' ? 'feedback'
    then
      raise exception using errcode = 'P0001',
        message = 'ACTIVATION_PROOF:SOLUTION_PRELOAD_OR_RELEASE_DRIFT';
    end if;
    v_resumed := public.start_or_resume_curriculum_unit(
      v_unit_id,
      extensions.gen_random_uuid()
    );
    if v_resumed ->> 'attempt_id' <> v_attempt_id::text then
      raise exception using errcode = 'P0001',
        message = 'ACTIVATION_PROOF:RESUME_IDENTITY_FAILED';
    end if;
    v_question_id :=
      v_state #>> '{current_question,question_id}';
    v_revision := (v_state ->> 'revision')::integer;
    select solution.correct_answer into v_correct_answer
    from private.curriculum_release_solutions as solution
    where solution.release_id =
      '${project004UniversalActivationContract.releaseId}'
      and solution.question_id = v_question_id;
    v_state := public.submit_curriculum_answer(
      v_attempt_id,
      v_question_id,
      v_correct_answer,
      v_revision,
      extensions.gen_random_uuid()
    );
    if not (v_state #>> '{feedback,is_correct}')::boolean then
      raise exception using errcode = 'P0001',
        message = 'ACTIVATION_PROOF:FIXED_PRACTICE_SUBMIT_FAILED';
    end if;
    v_progress := public.get_student_curriculum_progress();
    if
      (v_progress ->> 'grade')::integer <> v_grade
      or v_progress ->> 'compatibility_mode'
        <> 'UNIVERSAL_CURRICULUM'
      or jsonb_array_length(v_progress -> 'outcomes') = 0
      or jsonb_array_length(v_progress -> 'skills') = 0
    then
      raise exception using errcode = 'P0001',
        message = 'ACTIVATION_PROOF:PROGRESS_GRADE_MISMATCH';
    end if;
    if v_grade = 2 then
      v_grade2_attempt_id := v_attempt_id;
      v_grade2_unit_id := v_unit_id;
    end if;
  end loop;

  perform set_config(
    'request.jwt.claim.sub',
    '41000000-0000-4000-8000-000000000002',
    true
  );
  select unit.unit_id into v_unit_id
  from public.curriculum_release_units as unit
  where unit.release_id =
    '${project004UniversalActivationContract.releaseId}'
    and unit.grade = 3
  order by unit.display_order, unit.unit_id
  limit 1;
  begin
    perform public.start_or_resume_curriculum_unit(
      v_unit_id,
      extensions.gen_random_uuid()
    );
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:WRONG_GRADE_NOT_DENIED';
  exception when others then
    if sqlerrm <> 'CURRICULUM:UNIT_UNAVAILABLE' then
      raise;
    end if;
  end;

  if exists (
    select 1
    from public.adaptive_practice_releases
    where
      runtime_enabled
      or controlled_pilot_enabled
      or retention_runtime_enabled
      or publication_status <> 'DRAFT'
      or student_visibility <> 'HIDDEN'
  ) then
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:ADAPTIVE_PILOT_ENABLED';
  end if;

  foreach v_user_id in array array[
    '42000000-0000-4000-8000-000000000001'::uuid,
    '43000000-0000-4000-8000-000000000001'::uuid
  ] loop
    perform set_config(
      'request.jwt.claim.sub',
      v_user_id::text,
      true
    );
    begin
      perform public.get_student_curriculum_progress();
      raise exception using errcode = 'P0001',
        message = 'ACTIVATION_PROOF:ROLE_ACCESS_NOT_DENIED';
    exception when others then
      if sqlerrm <> 'CURRICULUM:FORBIDDEN' then raise; end if;
    end;
  end loop;

  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.get_student_curriculum_progress();
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:ANON_ACCESS_NOT_DENIED';
  exception when others then
    if sqlerrm <> 'CURRICULUM:UNAUTHENTICATED' then raise; end if;
  end;

  update public.curriculum_releases
  set
    status = 'DRAFT',
    activation_state = 'INACTIVE',
    activated_at = null
  where release_id =
    '${project004UniversalActivationContract.releaseId}';
  perform set_config(
    'request.jwt.claim.sub',
    '41000000-0000-4000-8000-000000000002',
    true
  );
  v_resumed := public.start_or_resume_curriculum_unit(
    v_grade2_unit_id,
    extensions.gen_random_uuid()
  );
  if v_resumed ->> 'attempt_id' <> v_grade2_attempt_id::text then
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:INACTIVE_RESUME_FAILED';
  end if;
  v_question_id :=
    v_resumed #>> '{current_question,question_id}';
  v_revision := (v_resumed ->> 'revision')::integer;
  select solution.correct_answer into v_correct_answer
  from private.curriculum_release_solutions as solution
  where solution.release_id =
    '${project004UniversalActivationContract.releaseId}'
    and solution.question_id = v_question_id;
  perform public.submit_curriculum_answer(
    v_grade2_attempt_id,
    v_question_id,
    v_correct_answer,
    v_revision,
    extensions.gen_random_uuid()
  );
  select unit.unit_id into v_other_unit_id
  from public.curriculum_release_units as unit
  where unit.release_id =
      '${project004UniversalActivationContract.releaseId}'
    and unit.grade = 2
    and unit.unit_id <> v_grade2_unit_id
  order by unit.display_order, unit.unit_id
  limit 1;
  begin
    perform public.start_or_resume_curriculum_unit(
      v_other_unit_id,
      extensions.gen_random_uuid()
    );
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:INACTIVE_NEW_START_NOT_DENIED';
  exception when others then
    if sqlerrm <> 'CURRICULUM:RELEASE_UNAVAILABLE' then raise; end if;
  end;
end;
$journey$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '41000000-0000-4000-8000-000000000002',
  true
);
do $private_boundary$
begin
  begin
    perform 1
    from private.curriculum_release_solutions
    limit 1;
    raise exception using errcode = 'P0001',
      message = 'ACTIVATION_PROOF:PRIVATE_SOLUTION_READ_NOT_DENIED';
  exception when insufficient_privilege then null;
  end;
end;
$private_boundary$;
reset role;
rollback;
select '${journeySentinel}';
`;
}

async function runActivationExtension(
  context: CleanDisposableProofExtensionContext,
  evidence: ActivationProofEvidence,
) {
  const before = await runStage(
    context,
    "ACTIVATION_PREFLIGHT",
    buildProject004UniversalActivationPreflightSql(
      "DRAFT_INACTIVE",
    ),
    { machineOutput: true },
  );
  verifyProject004UniversalActivationCounts(
    parseProject004UniversalActivationPreflight(before.stdout),
    "DRAFT_INACTIVE",
  );
  evidence.activationPreflight = "PASS";

  await runStage(
    context,
    "ACTIVATION_TRANSACTION",
    buildProject004UniversalActivationSql(),
    {
      sentinel:
        `${project004UniversalActivationContract.version}:COMMIT|ACTIVE`,
    },
  );
  const active = await runStage(
    context,
    "ACTIVATION_PREFLIGHT",
    buildProject004UniversalActivationPreflightSql("ACTIVE"),
    { machineOutput: true },
  );
  verifyProject004UniversalActivationCounts(
    parseProject004UniversalActivationPreflight(active.stdout),
    "ACTIVE",
  );
  evidence.activationTransaction = "PASS";

  await runStage(
    context,
    "ACTIVATION_JOURNEY",
    buildActivationJourneySql(context.root),
    { sentinel: journeySentinel },
  );
  evidence.grade1LegacyFixedPractice = "PASS";
  evidence.grades2To9UniversalFixedPractice = "PASS";
  evidence.schoolGradeIsolation = "PASS";
  evidence.privateSolutionBoundary = "PASS";
  evidence.grade2AdaptivePilot = "DISABLED";
  evidence.boundAttemptResumePolicy = "PASS";

  await runStage(
    context,
    "DEACTIVATION_TRANSACTION",
    buildProject004UniversalDeactivationSql(),
    {
      sentinel:
        `${project004UniversalActivationContract.version}:COMMIT|INACTIVE`,
    },
  );
  const finalState = await runStage(
    context,
    "ACTIVATION_PREFLIGHT",
    buildProject004UniversalActivationPreflightSql(
      "DRAFT_INACTIVE",
    ),
    { machineOutput: true },
  );
  verifyProject004UniversalActivationCounts(
    parseProject004UniversalActivationPreflight(
      finalState.stdout,
    ),
    "DRAFT_INACTIVE",
  );
  evidence.deactivationTransaction = "PASS";
  evidence.finalReleaseState = "DRAFT/INACTIVE";
}

export async function runProject004UniversalActivationDisposableProof() {
  const evidence: ActivationProofEvidence = {
    activationPreflight: "NOT_RUN",
    activationTransaction: "NOT_RUN",
    grade1LegacyFixedPractice: "NOT_RUN",
    grades2To9UniversalFixedPractice: "NOT_RUN",
    schoolGradeIsolation: "NOT_RUN",
    privateSolutionBoundary: "NOT_RUN",
    grade2AdaptivePilot: "NOT_RUN",
    deactivationTransaction: "NOT_RUN",
    boundAttemptResumePolicy: "NOT_RUN",
    finalReleaseState: "NOT_RUN",
  };
  const baseProof = await runProject004CleanDisposableProof({
    afterBaseProof: (context) =>
      runActivationExtension(context, evidence),
  });
  return { baseProof, evidence };
}

export function renderProject004UniversalActivationDisposableProof(
  result: Awaited<
    ReturnType<
      typeof runProject004UniversalActivationDisposableProof
    >
  >,
) {
  return (
    renderDisposableProof(result.baseProof) +
    [
      `ACTIVATION_PREFLIGHT=${result.evidence.activationPreflight}`,
      `ACTIVATION_TRANSACTION=${result.evidence.activationTransaction}`,
      `GRADE1_LEGACY_FIXED_PRACTICE=${result.evidence.grade1LegacyFixedPractice}`,
      `GRADES2_TO_9_UNIVERSAL_FIXED_PRACTICE=${result.evidence.grades2To9UniversalFixedPractice}`,
      `SCHOOL_GRADE_ISOLATION=${result.evidence.schoolGradeIsolation}`,
      `PRIVATE_SOLUTION_BOUNDARY=${result.evidence.privateSolutionBoundary}`,
      `GRADE2_ADAPTIVE_PILOT=${result.evidence.grade2AdaptivePilot}`,
      `BOUND_ATTEMPT_RESUME_AFTER_DEACTIVATION=${result.evidence.boundAttemptResumePolicy}`,
      `DEACTIVATION_TRANSACTION=${result.evidence.deactivationTransaction}`,
      `FINAL_UNIVERSAL_RELEASE=${result.evidence.finalReleaseState}`,
      "REMOTE_ACCESS_PERFORMED=NO",
      "REMOTE_MUTATION_PERFORMED=NO",
      "PROJECT004_UNIVERSAL_ACTIVATION_DISPOSABLE_PROOF=PASS",
      "",
    ].join("\n")
  );
}

function renderFailure(error: unknown) {
  const failure = error as ActivationProofFailure;
  const code =
    error instanceof Error
      ? error.message
      : "DISPOSABLE_UNIVERSAL_ACTIVATION_PROOF_FAILED";
  return [
    "PROJECT004_CANONICAL=PASS",
    `DISPOSABLE_CLEANUP=${failure.cleanup ?? "NOT_STARTED"}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    `ROOT_FAILURE_CODE=${code}`,
    "PROJECT004_UNIVERSAL_ACTIVATION_DISPOSABLE_PROOF=FAIL",
    "",
  ].join("\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  try {
    process.stdout.write(
      renderProject004UniversalActivationDisposableProof(
        await runProject004UniversalActivationDisposableProof(),
      ),
    );
  } catch (error) {
    process.stdout.write(renderFailure(error));
    process.exitCode = 1;
  }
}
