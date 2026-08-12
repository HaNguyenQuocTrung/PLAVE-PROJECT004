import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const imageTag = "postgres:16-alpine";
const name = `plave-g2-g9-release-${randomBytes(5).toString("hex")}`;
const syntheticPassword = "plave-synthetic-local-only-0045";
const commandEnvironment = {
  PATH: process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin",
  ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
  LANG: "C",
  LC_ALL: "C",
};

function docker(args: readonly string[], input?: string, capture = false) {
  const result = spawnSync("docker", args, {
    env: commandEnvironment,
    input,
    encoding: "utf8",
    stdio: capture ? [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] : [input === undefined ? "ignore" : "pipe", "inherit", "inherit"],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`LOCAL_DB_PROOF:DOCKER_COMMAND_FAILED:${args[0] ?? "UNKNOWN"}`);
  }
  return capture ? String(result.stdout).trim() : "";
}

function psql(sql: string, capture = false) {
  return docker(["exec", "-i", name, "psql", "--quiet", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--username", "postgres", "--dbname", "postgres", ...(capture ? ["--tuples-only", "--no-align"] : [])], sql, capture);
}

let started = false;
try {
  const localImageIds = docker(["images", "--quiet", "--no-trunc", imageTag], undefined, true)
    .split("\n").filter(Boolean);
  if (localImageIds.length !== 1 || !/^sha256:[0-9a-f]{64}$/u.test(localImageIds[0]!)) {
    throw new Error("LOCAL_DB_PROOF:IMMUTABLE_LOCAL_IMAGE_REQUIRED");
  }
  const image = localImageIds[0]!;
  docker(["image", "inspect", image], undefined, true);
  docker(["run", "--detach", "--rm", "--pull=never", "--network=none", "--name", name,
    "--env", `POSTGRES_PASSWORD=${syntheticPassword}`, "--env", "POSTGRES_DB=postgres", image], undefined, true);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const primary = spawnSync("docker", ["exec", name, "sh", "-c", '[ "$(cat /proc/1/comm)" = "postgres" ]'], {
      env: commandEnvironment, encoding: "utf8", stdio: "ignore",
    });
    const status = spawnSync("docker", ["exec", name, "pg_isready", "--username", "postgres", "--dbname", "postgres"], {
      env: commandEnvironment, encoding: "utf8", stdio: "ignore",
    });
    if (primary.status === 0 && status.status === 0) { ready = true; break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  if (!ready) throw new Error("LOCAL_DB_PROOF:POSTGRES_NOT_READY");

  psql(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth authorization postgres;
    create schema extensions authorization postgres;
    create schema supabase_migrations authorization postgres;
    create table supabase_migrations.schema_migrations (
      version text primary key,
      statements text[] not null default array[]::text[]
    );
    create table auth.users (
      id uuid primary key,
      aud text,
      role text,
      email text,
      raw_app_meta_data jsonb not null default '{}'::jsonb,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz,
      updated_at timestamptz
    );
    create or replace function auth.uid() returns uuid language sql stable
    set search_path='' as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
  `);

  const migrations = readdirSync(join(root, "supabase/migrations"))
    .filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort();
  if (migrations.length !== 45 || !migrations.at(-1)?.startsWith("0045_")) {
    throw new Error("LOCAL_DB_PROOF:MIGRATION_INVENTORY_INVALID");
  }
  for (const migration of migrations) {
    try {
      psql(readFileSync(join(root, "supabase/migrations", migration), "utf8"));
      psql(`insert into supabase_migrations.schema_migrations(version,statements)
        values('${migration.slice(0, 4)}',array[]::text[]);`);
    } catch {
      throw new Error(`LOCAL_DB_PROOF:MIGRATION_FAILED:${migration}`);
    }
  }

  const gradeOneBefore = psql(`select encode(extensions.digest(string_agg(value,'|' order by value),'sha256'),'hex') from (
    select slug||':'||total_questions::text as value from public.learning_units where grade=1
    union all select code||':'||unit_slug from public.questions where unit_slug like 'grade-1-%'
    union all select question_id||':'||correct_answer from public.question_solutions where question_id in
      (select code from public.questions where unit_slug like 'grade-1-%')
  ) frozen;`, true);

  psql(readFileSync(join(root, "tests/fixtures/universal-curriculum-local-users.sql"), "utf8"));
  psql(`
    insert into public.parent_student_connections(id,parent_user_id,student_user_id,status,responded_at)
    values('44000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000002','PENDING',null);
    update public.parent_student_connections set status='APPROVED',responded_at=now()
    where id='44000000-0000-4000-8000-000000000001';
    insert into public.teacher_invitations(id,code_hash,status,expires_at,teacher_user_id,claimed_at)
    values('45000000-0000-4000-8000-000000000001',decode(repeat('ab',32),'hex'),'CLAIMED',now()+interval '1 day',
      '43000000-0000-4000-8000-000000000001',now());
    insert into public.teacher_profiles(user_id,full_name,invitation_id)
    values('43000000-0000-4000-8000-000000000001','Giáo viên thử','45000000-0000-4000-8000-000000000001');
    insert into public.classrooms(id,teacher_id,creation_request_id,name,grade,class_code)
    values('46000000-0000-4000-8000-000000000001','43000000-0000-4000-8000-000000000001',
      '46000000-0000-4000-8000-000000000002','Lớp thử 2',2,'PLV-CLS-ABCDEFGHJK');
    insert into public.classroom_memberships(id,classroom_id,student_id,status,responded_at)
    values('47000000-0000-4000-8000-000000000001','46000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000002','PENDING',null);
    update public.classroom_memberships set status='APPROVED',responded_at=now()
    where id='47000000-0000-4000-8000-000000000001';
    do $hidden_default$ begin
      perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
      begin perform public.get_my_grades_2_9_release_catalog(); raise exception 'PROOF:HIDDEN_DEFAULT_ALLOWED';
      exception when others then if sqlerrm<>'CURRICULUM:RELEASE_UNAVAILABLE' then raise; end if; end;
    end; $hidden_default$;
  `);
  // Exercise the exact remotely reviewed package against PostgreSQL rather
  // than relying on static SQL assertions. This locks PL/pgSQL parseability,
  // exact-tuple guards, atomic activation, and its terminal success contract.
  psql(readFileSync(join(root, "supabase/operations/grades-2-9-remote-release/ACTIVATE_PUBLIC.sql"), "utf8"));
  psql(`do $pilot$
  declare v_policy public.curriculum_grade_release_policies%rowtype; v_catalog jsonb;
  begin
    update public.curriculum_grade_release_policies set release_mode='PILOT',updated_at=now() where grade=2;
    select * into v_policy from public.curriculum_grade_release_policies where grade=2;
    perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
    begin perform public.get_my_grades_2_9_release_catalog(); raise exception 'PROOF:PILOT_WITHOUT_ENTITLEMENT_ALLOWED';
    exception when others then if sqlerrm<>'CURRICULUM:RELEASE_UNAVAILABLE' then raise; end if; end;
    insert into public.curriculum_release_pilot_entitlements(student_id,grade,release_id,candidate_id,candidate_version,
      candidate_bundle_sha256,policy_version)
    values('41000000-0000-4000-8000-000000000002',2,v_policy.release_id,v_policy.candidate_id,
      v_policy.candidate_version,v_policy.candidate_bundle_sha256,v_policy.policy_version);
    v_catalog:=public.get_my_grades_2_9_release_catalog();
    if v_catalog->>'release_mode'<>'PILOT' then raise exception 'PROOF:PILOT_ENTITLEMENT_NOT_HONORED'; end if;
    delete from public.curriculum_release_pilot_entitlements where student_id='41000000-0000-4000-8000-000000000002';
    update public.curriculum_grade_release_policies set release_mode='PUBLIC',updated_at=now() where grade=2;
  end; $pilot$;`);
  psql(`
do $proof$
declare v_grade integer; v_user uuid; v_unit text; v_state jsonb; v_attempt uuid; v_question text;
  v_answer text; v_answer_type text; v_history jsonb; v_progress jsonb;
  v_expected_revision integer; v_submission uuid; v_duplicate jsonb;
begin
  if (select count(*) from public.curriculum_grade_release_policies where release_mode='PUBLIC' and runtime_enabled and catalog_enabled)<>8
    then raise exception 'PROOF:PUBLIC_RELEASE_COUNT'; end if;
  if (select count(*) from public.curriculum_release_pilot_entitlements)<>0 then raise exception 'PROOF:DEFAULT_ENTITLEMENT'; end if;
  if has_table_privilege('authenticated','private.curriculum_release_solutions','select')
    then raise exception 'PROOF:SOLUTION_PRIVILEGE'; end if;
  for v_grade in 2..9 loop
    v_user:=format('41000000-0000-4000-8000-%s',lpad(v_grade::text,12,'0'))::uuid;
    perform set_config('request.jwt.claim.sub',v_user::text,true);
    select value->>'unit_id' into v_unit from jsonb_array_elements(public.get_my_grades_2_9_release_catalog()->'units') value limit 1;
    if v_unit is null then raise exception 'PROOF:CATALOG_EMPTY:G%',v_grade; end if;
    v_state:=public.start_or_resume_released_curriculum_unit(v_unit,gen_random_uuid());
    if (v_state->>'grade')::integer<>v_grade or v_state->'current_question' ? 'correct_answer'
      or v_state->'current_question' ? 'solution_steps' then raise exception 'PROOF:START_OR_LEAK:G%',v_grade; end if;
    v_attempt:=(v_state->>'attempt_id')::uuid; v_question:=v_state#>>'{current_question,question_id}';
    v_answer_type:=v_state#>>'{current_question,answer_type}';
    v_expected_revision:=(v_state->>'revision')::integer;
    v_submission:=gen_random_uuid();
    select solution.correct_answer into v_answer from private.curriculum_release_solutions solution
      where solution.release_id=v_state->>'release_id' and solution.question_id=v_question;
    begin
      v_state:=public.submit_curriculum_answer(v_attempt,v_question,v_answer,v_expected_revision,v_submission);
    exception when others then
      raise exception 'PROOF:SUBMIT_ERROR:G%:TYPE=%:ANSWER_LENGTH=%:%',v_grade,v_answer_type,char_length(v_answer),sqlerrm;
    end;
    if not (v_state#>>'{feedback,is_correct}')::boolean then raise exception 'PROOF:SUBMIT:G%',v_grade; end if;
    if v_grade=2 then
      v_duplicate:=public.submit_curriculum_answer(v_attempt,v_question,v_answer,v_expected_revision,v_submission);
      if (select count(*) from public.curriculum_answers where attempt_id=v_attempt)<>1
        or v_duplicate#>>'{feedback,question_id}'<>v_question
      then raise exception 'PROOF:DUPLICATE_EFFECT'; end if;
      begin
        perform public.submit_curriculum_answer(v_attempt,v_question,v_answer,v_expected_revision,gen_random_uuid());
        raise exception 'PROOF:STALE_CAS_ALLOWED';
      exception when others then
        if sqlerrm<>'CURRICULUM:REVISION_CONFLICT' then raise; end if;
      end;
    end if;
    v_history:=public.get_student_curriculum_history(); v_progress:=public.get_my_released_curriculum_progress();
    if jsonb_array_length(v_history->'attempts')<1 or jsonb_array_length(v_progress->'units')<1
      then raise exception 'PROOF:PERSISTENCE:G%',v_grade; end if;
  end loop;
  perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
  select unit.unit_id into v_unit from public.curriculum_release_units unit
    join public.curriculum_grade_release_policies policy on policy.release_id=unit.release_id
    where policy.grade=3 and unit.total_questions>0 order by unit.display_order limit 1;
  begin perform public.start_or_resume_released_curriculum_unit(v_unit,gen_random_uuid());
    raise exception 'PROOF:WRONG_GRADE_ALLOWED'; exception when others then
      if sqlerrm<>'CURRICULUM:UNIT_UNAVAILABLE' then raise; end if; end;
  foreach v_user in array array['42000000-0000-4000-8000-000000000001'::uuid,'43000000-0000-4000-8000-000000000001'::uuid] loop
    perform set_config('request.jwt.claim.sub',v_user::text,true);
    begin perform public.get_my_grades_2_9_release_catalog(); raise exception 'PROOF:ROLE_ALLOWED';
      exception when others then if sqlerrm<>'CURRICULUM:FORBIDDEN' then raise; end if; end;
  end loop;
end;
$proof$;`);

  psql(`do $fixed_safe$
declare v_row record; v_skill record; v_user uuid; v_state jsonb; v_attempt uuid;
  v_question text; v_answer text; v_result jsonb;
begin
  for v_row in select distinct policy.grade,question.unit_id
    from public.curriculum_release_questions question
    join public.curriculum_grade_release_policies policy on policy.release_id=question.release_id
    where question.support_mode='FIXED_SAFE' order by policy.grade,question.unit_id
  loop
    v_user:=format('41000000-0000-4000-8000-%s',lpad(v_row.grade::text,12,'0'))::uuid;
    perform set_config('request.jwt.claim.sub',v_user::text,true);
    v_state:=public.start_or_resume_released_curriculum_unit(v_row.unit_id,gen_random_uuid());
    v_attempt:=(v_state->>'attempt_id')::uuid;
    for v_skill in select distinct question.skill_id from public.curriculum_release_questions question
      where question.release_id=v_state->>'release_id' and question.unit_id=v_row.unit_id
        and question.support_mode='FIXED_SAFE'
    loop
      if not exists(select 1 from public.curriculum_attempts attempt
        join public.curriculum_release_questions question on question.release_id=attempt.release_id
          and question.question_id=any(attempt.question_sequence)
        where attempt.id=v_attempt and question.skill_id=v_skill.skill_id)
      then raise exception 'PROOF:FIXED_SAFE_SKILL_NOT_SELECTABLE:G%:%',v_row.grade,v_skill.skill_id; end if;
    end loop;
  end loop;

  perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000008',true);
  v_state:=public.start_or_resume_released_curriculum_unit('grade-8-applied-problem-solving',gen_random_uuid());
  v_attempt:=(v_state->>'attempt_id')::uuid; v_question:=v_state#>>'{current_question,question_id}';
  select solution.correct_answer into v_answer from private.curriculum_release_solutions solution
    where solution.release_id=v_state->>'release_id' and solution.question_id=v_question;
  v_result:=public.submit_curriculum_answer(v_attempt,v_question,v_answer,(v_state->>'revision')::integer,gen_random_uuid());
  if jsonb_array_length(v_result#>'{scoring,mastery_changes}')<>0
    or exists(select 1 from private.student_mastery_evidence evidence where evidence.attempt_id=v_attempt and evidence.question_id=v_question)
    or exists(select 1 from public.student_curriculum_skill_progress progress
      join public.curriculum_release_questions question on question.release_id=progress.release_id and question.skill_id=progress.skill_id
      where progress.student_id='41000000-0000-4000-8000-000000000008' and question.question_id=v_question)
    or not exists(select 1 from private.student_xp_ledger ledger where ledger.attempt_id=v_attempt and ledger.question_id=v_question)
  then raise exception 'PROOF:FIXED_SAFE_MASTERY_OR_XP_CONTRACT'; end if;
end;
$fixed_safe$;`);
  psql(`do $stakeholders$ declare v_view jsonb; begin
    perform set_config('request.jwt.claim.sub','42000000-0000-4000-8000-000000000001',true);
    v_view:=public.get_parent_child_universal_progress('44000000-0000-4000-8000-000000000001');
    if (v_view#>>'{student,grade}')::integer<>2 or (v_view#>>'{summary,total_answered}')::integer<1
      or jsonb_array_length(v_view->'attempts')<1
    then raise exception 'PROOF:PARENT_PROGRESS_HISTORY_MISSING'; end if;
    perform set_config('request.jwt.claim.sub','43000000-0000-4000-8000-000000000001',true);
    v_view:=public.get_teacher_membership_learning_motivation_v1('47000000-0000-4000-8000-000000000001');
    if (v_view#>>'{student,grade}')::integer<>2 or v_view->'scoring' is null or v_view->'motivation' is null
    then raise exception 'PROOF:TEACHER_PROGRESS_MOTIVATION_MISSING'; end if;
  end; $stakeholders$;`);

  const attemptsBeforeDeactivation = psql("select count(*) from public.curriculum_attempts where release_candidate_id is not null;", true);
  psql(readFileSync(join(root, "supabase/operations/grades-2-9-local-release/DEACTIVATE.sql"), "utf8"));
  const persistenceAfterDeactivation = psql(`select (select count(*) from public.curriculum_attempts where release_candidate_id is not null)||':'||
    (select count(*) from public.curriculum_answers answer join public.curriculum_attempts attempt on attempt.id=answer.attempt_id where attempt.release_candidate_id is not null)||':'||
    (select count(*) from public.curriculum_release_questions question join public.curriculum_grade_release_policies policy on policy.release_id=question.release_id);`, true);
  if (!persistenceAfterDeactivation.startsWith(`${attemptsBeforeDeactivation}:9:2460`)) {
    throw new Error("LOCAL_DB_PROOF:DEACTIVATION_HISTORY_LOSS");
  }
  psql(`do $hidden$ declare v_unit text; begin
    perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
    select unit.unit_id into v_unit from public.curriculum_release_units unit join public.curriculum_grade_release_policies policy on policy.release_id=unit.release_id
      where policy.grade=2 and unit.total_questions>0 and not exists(select 1 from public.curriculum_attempts attempt where attempt.student_id='41000000-0000-4000-8000-000000000002' and attempt.unit_id=unit.unit_id)
      order by unit.display_order limit 1;
    begin perform public.start_or_resume_released_curriculum_unit(v_unit,gen_random_uuid()); raise exception 'PROOF:HIDDEN_START_ALLOWED';
      exception when others then if sqlerrm<>'CURRICULUM:RELEASE_UNAVAILABLE' then raise; end if; end;
  end; $hidden$;`);
  psql(`do $resume$ declare v_attempt uuid; v_unit text; v_state jsonb; v_count integer; begin
    perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
    select attempt.id,attempt.unit_id into v_attempt,v_unit from public.curriculum_attempts attempt
      where attempt.student_id='41000000-0000-4000-8000-000000000002' and attempt.status='IN_PROGRESS'
      order by attempt.started_at limit 1;
    select count(*) into v_count from public.curriculum_attempts where student_id='41000000-0000-4000-8000-000000000002';
    v_state:=public.start_or_resume_released_curriculum_unit(v_unit,gen_random_uuid());
    if (v_state->>'attempt_id')::uuid<>v_attempt
      or (select count(*) from public.curriculum_attempts where student_id='41000000-0000-4000-8000-000000000002')<>v_count
    then raise exception 'PROOF:DEACTIVATED_RESUME_CHANGED_ATTEMPT'; end if;
  end; $resume$;`);

  const gradeOneAfter = psql(`select encode(extensions.digest(string_agg(value,'|' order by value),'sha256'),'hex') from (
    select slug||':'||total_questions::text as value from public.learning_units where grade=1
    union all select code||':'||unit_slug from public.questions where unit_slug like 'grade-1-%'
    union all select question_id||':'||correct_answer from public.question_solutions where question_id in
      (select code from public.questions where unit_slug like 'grade-1-%')
  ) frozen;`, true);
  if (gradeOneBefore !== gradeOneAfter) throw new Error("LOCAL_DB_PROOF:GRADE_ONE_DRIFT");
  console.log(`GRADES_2_9_LOCAL_DB_PROOF_OK migrations=45 questions=2460 attempts=${attemptsBeforeDeactivation} grade1_digest_preserved=true rollback=atomic_sql_contract`);
} finally {
  if (started) {
    spawnSync("docker", ["stop", "--time", "2", name], { env: commandEnvironment, stdio: "ignore" });
  }
}
