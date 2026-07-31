begin;

alter table public.learning_units
add column prerequisite_unit_slug text;

alter table public.learning_units
add constraint learning_units_prerequisite_unit_fk
foreign key (prerequisite_unit_slug)
references public.learning_units(slug)
on delete restrict;

alter table public.learning_units
add constraint learning_units_prerequisite_not_self_check
check (
  prerequisite_unit_slug is null
  or prerequisite_unit_slug <> slug
);

alter table public.questions
drop constraint questions_skill_code_check;

alter table public.questions
add constraint questions_skill_code_check
check (
  skill_code in (
    'COUNT_RECOGNIZE',
    'READ_WRITE_MATCH',
    'SEQUENCE_COMPARE_ORDER',
    'COMPOSE_DECOMPOSE',
    'ADDITION_MEANING',
    'ADDITION_CALCULATION',
    'NUMBER_BONDS',
    'ONE_STEP_WORD_PROBLEM'
  )
);

insert into public.learning_units (
  slug,
  grade,
  title,
  description,
  learning_objectives,
  lesson_content,
  total_questions,
  published,
  display_order,
  prerequisite_unit_slug
)
values (
  'grade-1-addition-within-10',
  1,
  'Phép cộng trong phạm vi 10',
  'Hiểu phép cộng là gộp thêm và tính đúng các tổng không vượt quá 10.',
  $objectives$[
    "Nhận biết phép cộng trong tình huống gộp hoặc thêm.",
    "Đọc và viết đúng phép tính với dấu + và dấu =.",
    "Đếm tiếp để tìm tổng trong phạm vi 10.",
    "Tìm được các cặp số tạo thành một số từ 5 đến 10.",
    "Giải được bài toán có lời văn một bước bằng phép cộng."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "addition-means-combine",
        "title": "Phép cộng là gộp thêm",
        "paragraphs": [
          "Khi gộp hai nhóm đồ vật lại, ta dùng phép cộng để tìm tất cả có bao nhiêu.",
          "Ví dụ: 2 chấm tròn gộp với 3 chấm tròn thì có tất cả 5 chấm tròn."
        ]
      },
      {
        "code": "plus-and-equals",
        "title": "Dấu cộng và dấu bằng",
        "paragraphs": [
          "Dấu + đọc là cộng và cho biết ta đang gộp hoặc thêm.",
          "Dấu = đọc là bằng. Phía sau dấu = là kết quả của phép tính."
        ]
      },
      {
        "code": "count-on",
        "title": "Đếm tiếp để tìm tổng",
        "paragraphs": [
          "Giữ số đầu tiên trong đầu rồi đếm tiếp thêm số lần bằng số thứ hai.",
          "Với 4 + 3, bắt đầu từ 4 rồi đếm tiếp 5, 6, 7 nên tổng là 7."
        ]
      },
      {
        "code": "number-bonds",
        "title": "Các cách tạo thành một số",
        "paragraphs": [
          "Một số có thể được tạo bởi nhiều cặp số khác nhau.",
          "Số 8 có thể tạo bởi 3 và 5, hoặc 4 và 4."
        ]
      },
      {
        "code": "adding-zero",
        "title": "Cộng với số 0",
        "paragraphs": [
          "Thêm 0 nghĩa là không thêm đồ vật nào.",
          "Vì vậy một số cộng với 0 vẫn bằng chính số đó, chẳng hạn 6 + 0 = 6."
        ]
      },
      {
        "code": "one-step-story",
        "title": "Bài toán có lời văn một bước",
        "paragraphs": [
          "Đọc xem ban đầu có bao nhiêu, sau đó được thêm bao nhiêu.",
          "Viết một phép cộng rồi tính tổng để trả lời câu hỏi."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Gộp hai nhóm chấm tròn",
        "steps": [
          "Nhóm thứ nhất có 2 chấm tròn, nhóm thứ hai có 3 chấm tròn.",
          "Gộp hai nhóm và viết phép tính 2 + 3 = 5.",
          "Đếm lại tất cả để kiểm tra: 1, 2, 3, 4, 5."
        ],
        "answer": "Có tất cả 5 chấm tròn."
      },
      {
        "title": "Bài toán về những quả táo",
        "steps": [
          "Lan có 4 quả táo và được cho thêm 2 quả nên ta dùng phép cộng.",
          "Viết phép tính 4 + 2 = 6.",
          "Trả lời câu hỏi bằng một câu đầy đủ."
        ],
        "answer": "Lan có tất cả 6 quả táo."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  2,
  'grade-1-numbers-to-10'
);

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-add-q01","question_type":"MULTIPLE_CHOICE","prompt":"Có 3 quả táo, thêm 2 quả táo. Phép tính nào phù hợp?","options":{"A":"3 + 2","B":"3 + 3","C":"2 + 2","D":"5 + 2"},"skill_code":"ADDITION_MEANING","difficulty":"EASY","display_order":1},
      {"code":"g1-add-q02","question_type":"MULTIPLE_CHOICE","prompt":"Nhóm thứ nhất có 2 chấm, nhóm thứ hai có 3 chấm. Chọn phép tính để gộp hai nhóm.","options":{"A":"2 + 2","B":"2 + 3","C":"3 + 3","D":"5 + 1"},"skill_code":"ADDITION_MEANING","difficulty":"EASY","display_order":2},
      {"code":"g1-add-q03","question_type":"MULTIPLE_CHOICE","prompt":"Mai có 4 bút chì và được cho thêm 1 bút chì. Em cần dùng phép tính nào?","options":{"A":"4 + 0","B":"1 + 1","C":"4 + 1","D":"4 + 4"},"skill_code":"ADDITION_MEANING","difficulty":"EASY","display_order":3},
      {"code":"g1-add-q04","question_type":"MULTIPLE_CHOICE","prompt":"Trên cành có 5 con chim, thêm 2 con bay tới. Phép tính đúng là gì?","options":{"A":"5 + 2","B":"5 + 5","C":"2 + 2","D":"7 + 2"},"skill_code":"ADDITION_MEANING","difficulty":"MEDIUM","display_order":4},
      {"code":"g1-add-q05","question_type":"NUMBER_INPUT","prompt":"Gộp 1 khối vuông với 3 khối vuông. Có tất cả bao nhiêu khối vuông?","options":null,"skill_code":"ADDITION_MEANING","difficulty":"EASY","display_order":5},
      {"code":"g1-add-q06","question_type":"NUMBER_INPUT","prompt":"Có 2 chiếc cốc, đặt thêm 4 chiếc cốc. Có tất cả bao nhiêu chiếc cốc?","options":null,"skill_code":"ADDITION_MEANING","difficulty":"MEDIUM","display_order":6},

      {"code":"g1-add-q07","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 2 + 5 là số nào?","options":{"A":"6","B":"7","C":"8","D":"9"},"skill_code":"ADDITION_CALCULATION","difficulty":"EASY","display_order":7},
      {"code":"g1-add-q08","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 6 + 0 là số nào?","options":{"A":"0","B":"5","C":"6","D":"7"},"skill_code":"ADDITION_CALCULATION","difficulty":"EASY","display_order":8},
      {"code":"g1-add-q09","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 4 + 4 là số nào?","options":{"A":"6","B":"7","C":"8","D":"9"},"skill_code":"ADDITION_CALCULATION","difficulty":"EASY","display_order":9},
      {"code":"g1-add-q10","question_type":"MULTIPLE_CHOICE","prompt":"Phép cộng nào dưới đây có kết quả bằng 10?","options":{"A":"1 + 8","B":"2 + 8","C":"3 + 6","D":"4 + 5"},"skill_code":"ADDITION_CALCULATION","difficulty":"MEDIUM","display_order":10},
      {"code":"g1-add-q11","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của phép cộng 3 + 6.","options":null,"skill_code":"ADDITION_CALCULATION","difficulty":"EASY","display_order":11},
      {"code":"g1-add-q12","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của phép cộng 0 + 7.","options":null,"skill_code":"ADDITION_CALCULATION","difficulty":"EASY","display_order":12},

      {"code":"g1-add-q13","question_type":"MULTIPLE_CHOICE","prompt":"Cặp số nào dưới đây cộng lại được 5?","options":{"A":"1 và 3","B":"2 và 3","C":"2 và 2","D":"3 và 3"},"skill_code":"NUMBER_BONDS","difficulty":"EASY","display_order":13},
      {"code":"g1-add-q14","question_type":"MULTIPLE_CHOICE","prompt":"Số 2 cần cộng với số nào để tạo thành 6?","options":{"A":"2","B":"3","C":"4","D":"5"},"skill_code":"NUMBER_BONDS","difficulty":"EASY","display_order":14},
      {"code":"g1-add-q15","question_type":"MULTIPLE_CHOICE","prompt":"Điền số thích hợp vào ô trống: 3 + □ = 8.","options":{"A":"3","B":"4","C":"5","D":"6"},"skill_code":"NUMBER_BONDS","difficulty":"MEDIUM","display_order":15},
      {"code":"g1-add-q16","question_type":"MULTIPLE_CHOICE","prompt":"Cặp số nào dưới đây tạo thành số 10?","options":{"A":"3 và 6","B":"4 và 5","C":"4 và 6","D":"5 và 4"},"skill_code":"NUMBER_BONDS","difficulty":"MEDIUM","display_order":16},
      {"code":"g1-add-q17","question_type":"NUMBER_INPUT","prompt":"Điền số còn thiếu để phép tính đúng: 4 + □ = 9.","options":null,"skill_code":"NUMBER_BONDS","difficulty":"MEDIUM","display_order":17},
      {"code":"g1-add-q18","question_type":"NUMBER_INPUT","prompt":"Điền số còn thiếu để phép tính đúng: □ + 3 = 10.","options":null,"skill_code":"NUMBER_BONDS","difficulty":"MEDIUM","display_order":18},

      {"code":"g1-add-q19","question_type":"MULTIPLE_CHOICE","prompt":"Lan có 2 quả bóng, được tặng thêm 3 quả. Lan có tất cả bao nhiêu quả bóng?","options":{"A":"4 quả","B":"5 quả","C":"6 quả","D":"7 quả"},"skill_code":"ONE_STEP_WORD_PROBLEM","difficulty":"EASY","display_order":19},
      {"code":"g1-add-q20","question_type":"MULTIPLE_CHOICE","prompt":"Có 4 con chim trên sân, 2 con khác bay tới. Trên sân có tất cả bao nhiêu con chim?","options":{"A":"5 con","B":"6 con","C":"7 con","D":"8 con"},"skill_code":"ONE_STEP_WORD_PROBLEM","difficulty":"EASY","display_order":20},
      {"code":"g1-add-q21","question_type":"MULTIPLE_CHOICE","prompt":"Bể nhỏ có 5 con cá, thả thêm 1 con. Bể có tất cả bao nhiêu con cá?","options":{"A":"5 con","B":"6 con","C":"7 con","D":"8 con"},"skill_code":"ONE_STEP_WORD_PROBLEM","difficulty":"EASY","display_order":21},
      {"code":"g1-add-q22","question_type":"MULTIPLE_CHOICE","prompt":"Bình có 3 bông hoa đỏ và 4 bông hoa vàng. Bình có tất cả bao nhiêu bông hoa?","options":{"A":"6 bông","B":"7 bông","C":"8 bông","D":"9 bông"},"skill_code":"ONE_STEP_WORD_PROBLEM","difficulty":"MEDIUM","display_order":22},
      {"code":"g1-add-q23","question_type":"NUMBER_INPUT","prompt":"Nam có 6 bút chì và được cho thêm 2 bút chì. Nam có tất cả bao nhiêu bút chì?","options":null,"skill_code":"ONE_STEP_WORD_PROBLEM","difficulty":"EASY","display_order":23},
      {"code":"g1-add-q24","question_type":"NUMBER_INPUT","prompt":"Có 1 chiếc ô tô đồ chơi, đặt thêm 5 chiếc. Có tất cả bao nhiêu chiếc ô tô đồ chơi?","options":null,"skill_code":"ONE_STEP_WORD_PROBLEM","difficulty":"MEDIUM","display_order":24}
    ]$questions$::jsonb
  ) as item(
    code text,
    question_type text,
    prompt text,
    options jsonb,
    skill_code text,
    difficulty text,
    display_order smallint
  )
)
insert into public.questions (
  code,
  unit_slug,
  question_type,
  prompt,
  options,
  skill_code,
  difficulty,
  display_order,
  published
)
select
  seed.code,
  'grade-1-addition-within-10',
  seed.question_type,
  seed.prompt,
  seed.options,
  seed.skill_code,
  seed.difficulty,
  seed.display_order,
  true
from question_seed as seed;

with solution_seed as (
  select *
  from jsonb_to_recordset(
    $solutions$[
      {"question_id":"g1-add-q01","correct_answer":"A","solution_steps":["Ban đầu có 3 quả táo và thêm 2 quả táo.","Tình huống thêm được viết là 3 + 2."],"explanation":"Phép cộng 3 + 2 biểu diễn đúng việc có 3 rồi thêm 2.","hint":"Tìm số đồ vật ban đầu và số đồ vật được thêm."},
      {"question_id":"g1-add-q02","correct_answer":"B","solution_steps":["Nhóm thứ nhất có 2 chấm và nhóm thứ hai có 3 chấm.","Gộp hai nhóm nên viết 2 + 3."],"explanation":"Dấu cộng dùng để gộp hai nhóm 2 và 3.","hint":"Đọc số chấm trong từng nhóm rồi đặt dấu cộng ở giữa."},
      {"question_id":"g1-add-q03","correct_answer":"C","solution_steps":["Mai có sẵn 4 bút chì.","Được thêm 1 bút chì nên viết 4 + 1."],"explanation":"Thêm một đồ vật vào nhóm bốn đồ vật là phép cộng 4 + 1.","hint":"Từ “thêm” cho biết em cần dùng phép cộng."},
      {"question_id":"g1-add-q04","correct_answer":"A","solution_steps":["Trên cành có sẵn 5 con chim.","Có thêm 2 con bay tới nên viết 5 + 2."],"explanation":"Phép tính 5 + 2 đúng với tình huống có năm rồi thêm hai.","hint":"Giữ số chim ban đầu trước dấu cộng và số chim bay tới sau dấu cộng."},
      {"question_id":"g1-add-q05","correct_answer":"4","solution_steps":["Gộp nhóm 1 khối với nhóm 3 khối.","Đếm tất cả: 1, 2, 3, 4."],"explanation":"Một khối cộng ba khối bằng bốn khối.","hint":"Gộp hai nhóm rồi đếm từng khối một lần."},
      {"question_id":"g1-add-q06","correct_answer":"6","solution_steps":["Có 2 chiếc cốc và đặt thêm 4 chiếc.","Đếm tiếp từ 2: 3, 4, 5, 6."],"explanation":"Hai chiếc cốc cộng bốn chiếc cốc bằng sáu chiếc.","hint":"Bắt đầu từ 2 rồi đếm tiếp thêm bốn số."},

      {"question_id":"g1-add-q07","correct_answer":"B","solution_steps":["Bắt đầu từ 5 và đếm thêm 2.","Sau 5 là 6 rồi 7, nên 2 + 5 = 7."],"explanation":"Tổng của 2 và 5 là 7.","hint":"Đếm tiếp hai bước từ số 5."},
      {"question_id":"g1-add-q08","correct_answer":"C","solution_steps":["Số 0 nghĩa là không thêm gì.","Vì vậy 6 + 0 vẫn bằng 6."],"explanation":"Cộng với 0 không làm thay đổi số ban đầu.","hint":"Không thêm đồ vật nào thì số lượng vẫn giữ nguyên."},
      {"question_id":"g1-add-q09","correct_answer":"C","solution_steps":["Bắt đầu từ 4 và đếm thêm 4 bước.","Đếm 5, 6, 7, 8 nên tổng là 8."],"explanation":"Bốn cộng bốn bằng tám.","hint":"Đếm tiếp bốn số sau số 4."},
      {"question_id":"g1-add-q10","correct_answer":"B","solution_steps":["Tính từng lựa chọn: 1 + 8 = 9 và 2 + 8 = 10.","Các lựa chọn còn lại đều bằng 9, nên chọn 2 + 8."],"explanation":"Chỉ phép cộng 2 + 8 có tổng bằng 10.","hint":"Tính từng phép cộng rồi tìm kết quả bằng 10."},
      {"question_id":"g1-add-q11","correct_answer":"9","solution_steps":["Bắt đầu từ 6 và đếm thêm 3 bước.","Đếm 7, 8, 9 nên 3 + 6 = 9."],"explanation":"Tổng của 3 và 6 là 9.","hint":"Giữ số 6 rồi đếm tiếp ba số."},
      {"question_id":"g1-add-q12","correct_answer":"7","solution_steps":["Số 0 không thêm đơn vị nào vào số 7.","Vì vậy 0 + 7 = 7."],"explanation":"Cộng số 0 với 7 vẫn được 7.","hint":"Cộng với 0 giữ nguyên số còn lại."},

      {"question_id":"g1-add-q13","correct_answer":"B","solution_steps":["Tính các cặp số trong từng lựa chọn.","Chỉ có 2 + 3 = 5."],"explanation":"Hai và ba là một cặp số tạo thành năm.","hint":"Cộng hai số trong từng cặp và tìm tổng bằng 5."},
      {"question_id":"g1-add-q14","correct_answer":"C","solution_steps":["Ta cần tìm số còn thiếu trong 2 + □ = 6.","Đếm tiếp từ 2 đến 6 được bốn bước, nên số cần tìm là 4."],"explanation":"Hai cộng bốn bằng sáu.","hint":"Đếm từ 2 lên 6 xem cần thêm mấy bước."},
      {"question_id":"g1-add-q15","correct_answer":"C","solution_steps":["Ta cần tìm số còn thiếu trong 3 + □ = 8.","Đếm tiếp từ 3: 4, 5, 6, 7, 8, có năm bước."],"explanation":"Ba cộng năm bằng tám.","hint":"Đếm từ 3 lên 8 và đếm số bước."},
      {"question_id":"g1-add-q16","correct_answer":"C","solution_steps":["Tính tổng của từng cặp số.","Chỉ có 4 + 6 = 10."],"explanation":"Bốn và sáu là một cặp số tạo thành mười.","hint":"Tìm cặp có tổng đúng bằng 10."},
      {"question_id":"g1-add-q17","correct_answer":"5","solution_steps":["Ta cần tìm số còn thiếu trong 4 + □ = 9.","Đếm tiếp từ 4 đến 9 có năm bước, nên điền 5."],"explanation":"Bốn cộng năm bằng chín.","hint":"Đếm 5, 6, 7, 8, 9 từ số 4."},
      {"question_id":"g1-add-q18","correct_answer":"7","solution_steps":["Ta cần tìm số đứng trước dấu cộng trong □ + 3 = 10.","Vì 7 + 3 = 10 nên số cần điền là 7."],"explanation":"Bảy và ba tạo thành mười.","hint":"Nghĩ xem 3 cần thêm bao nhiêu để đến 10."},

      {"question_id":"g1-add-q19","correct_answer":"B","solution_steps":["Lan có 2 quả bóng và được thêm 3 quả nên viết 2 + 3.","Tính 2 + 3 = 5."],"explanation":"Lan có tất cả năm quả bóng.","hint":"Gộp số bóng có sẵn với số bóng được tặng."},
      {"question_id":"g1-add-q20","correct_answer":"B","solution_steps":["Có 4 con chim rồi thêm 2 con bay tới nên viết 4 + 2.","Tính 4 + 2 = 6."],"explanation":"Trên sân có tất cả sáu con chim.","hint":"Bắt đầu từ 4 rồi đếm thêm hai con."},
      {"question_id":"g1-add-q21","correct_answer":"B","solution_steps":["Bể có 5 con cá và được thêm 1 con nên viết 5 + 1.","Tính 5 + 1 = 6."],"explanation":"Bể có tất cả sáu con cá.","hint":"Thêm một vào số 5 thì được số liền sau."},
      {"question_id":"g1-add-q22","correct_answer":"B","solution_steps":["Có 3 bông hoa đỏ và 4 bông hoa vàng nên viết 3 + 4.","Tính 3 + 4 = 7."],"explanation":"Bình có tất cả bảy bông hoa.","hint":"Gộp số hoa đỏ và số hoa vàng."},
      {"question_id":"g1-add-q23","correct_answer":"8","solution_steps":["Nam có 6 bút chì và được thêm 2 bút chì nên viết 6 + 2.","Tính 6 + 2 = 8."],"explanation":"Nam có tất cả tám bút chì.","hint":"Bắt đầu từ 6 rồi đếm tiếp hai bước."},
      {"question_id":"g1-add-q24","correct_answer":"6","solution_steps":["Có 1 chiếc ô tô và đặt thêm 5 chiếc nên viết 1 + 5.","Tính 1 + 5 = 6."],"explanation":"Có tất cả sáu chiếc ô tô đồ chơi.","hint":"Gộp một chiếc có sẵn với năm chiếc được thêm."}
    ]$solutions$::jsonb
  ) as item(
    question_id text,
    correct_answer text,
    solution_steps jsonb,
    explanation text,
    hint text
  )
)
insert into public.question_solutions (
  question_id,
  correct_answer,
  solution_steps,
  explanation,
  hint
)
select
  seed.question_id,
  seed.correct_answer,
  seed.solution_steps,
  seed.explanation,
  seed.hint
from solution_seed as seed;

create or replace function public.start_or_resume_practice(
  p_unit_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_normalized_unit_slug text;
  v_student_count bigint := 0;
  v_student_grade smallint;
  v_unit_count bigint := 0;
  v_unit_grade smallint;
  v_unit_total_questions smallint;
  v_prerequisite_unit_slug text;
  v_prerequisite_completed_count bigint := 0;
  v_attempt_id uuid;
  v_attempt_status text;
  v_question_order text[];
  v_total_questions smallint;
  v_answered_count smallint;
  v_correct_count smallint;
  v_started_at timestamptz;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_normalized_unit_slug := lower(btrim(coalesce(p_unit_slug, '')));

  select
    count(*),
    max(student.grade)
  into
    v_student_count,
    v_student_grade
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where
    profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;

  if v_student_count <> 1 or v_student_grade is null then
    raise exception 'Student access required';
  end if;

  select
    count(*),
    max(unit.grade),
    max(unit.total_questions),
    max(unit.prerequisite_unit_slug)
  into
    v_unit_count,
    v_unit_grade,
    v_unit_total_questions,
    v_prerequisite_unit_slug
  from public.learning_units as unit
  where
    unit.slug = v_normalized_unit_slug
    and unit.published;

  if
    v_unit_count <> 1
    or v_unit_grade <> v_student_grade
    or v_unit_total_questions <> 24
  then
    raise exception 'Unit unavailable';
  end if;

  if v_prerequisite_unit_slug is not null then
    select count(*)
    into v_prerequisite_completed_count
    from public.practice_attempts as prerequisite_attempt
    where
      prerequisite_attempt.student_id = v_current_user_id
      and prerequisite_attempt.unit_slug = v_prerequisite_unit_slug
      and prerequisite_attempt.status = 'COMPLETED';

    if v_prerequisite_completed_count < 1 then
      raise exception 'Prerequisite required';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_current_user_id::text || ':' || v_normalized_unit_slug,
      0
    )
  );

  select
    attempt.id,
    attempt.status,
    attempt.question_order,
    attempt.total_questions,
    attempt.answered_count,
    attempt.correct_count,
    attempt.started_at
  into
    v_attempt_id,
    v_attempt_status,
    v_question_order,
    v_total_questions,
    v_answered_count,
    v_correct_count,
    v_started_at
  from public.practice_attempts as attempt
  where
    attempt.student_id = v_current_user_id
    and attempt.unit_slug = v_normalized_unit_slug
    and attempt.status = 'IN_PROGRESS'
  order by attempt.started_at desc, attempt.id desc
  limit 1;

  if v_attempt_id is null then
    select array_agg(question.code order by random())
    into v_question_order
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where
      question.unit_slug = v_normalized_unit_slug
      and question.published;

    if
      coalesce(cardinality(v_question_order), 0)
      <> v_unit_total_questions
    then
      raise exception 'Unit unavailable';
    end if;

    v_attempt_id := extensions.gen_random_uuid();
    v_attempt_status := 'IN_PROGRESS';
    v_total_questions := v_unit_total_questions;
    v_answered_count := 0;
    v_correct_count := 0;
    v_started_at := now();

    insert into public.practice_attempts (
      id,
      student_id,
      unit_slug,
      status,
      question_order,
      total_questions,
      answered_count,
      correct_count,
      started_at
    )
    values (
      v_attempt_id,
      v_current_user_id,
      v_normalized_unit_slug,
      v_attempt_status,
      v_question_order,
      v_total_questions,
      v_answered_count,
      v_correct_count,
      v_started_at
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'attempt_id', v_attempt_id,
    'unit_slug', v_normalized_unit_slug,
    'status', v_attempt_status,
    'question_order', to_jsonb(v_question_order),
    'total_questions', v_total_questions,
    'answered_count', v_answered_count,
    'correct_count', v_correct_count,
    'started_at', v_started_at
  );
end;
$$;

revoke all on function public.start_or_resume_practice(text) from public;
revoke all on function public.start_or_resume_practice(text) from anon;
grant execute on function public.start_or_resume_practice(text)
  to authenticated;

do $validation$
declare
  v_unit_count integer := 0;
  v_question_count integer := 0;
  v_solution_count integer := 0;
  v_mcq_count integer := 0;
  v_number_count integer := 0;
  v_skill_group_count integer := 0;
  v_function_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-1-addition-within-10'
    and unit.grade = 1
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 2
    and unit.prerequisite_unit_slug = 'grade-1-numbers-to-10'
    and jsonb_typeof(unit.learning_objectives) = 'array'
    and jsonb_array_length(unit.learning_objectives) >= 4
    and jsonb_typeof(unit.lesson_content -> 'sections') = 'array'
    and jsonb_array_length(unit.lesson_content -> 'sections') = 6
    and jsonb_typeof(unit.lesson_content -> 'worked_examples') = 'array'
    and jsonb_array_length(unit.lesson_content -> 'worked_examples') >= 2;

  select
    count(*),
    count(*) filter (
      where question.question_type = 'MULTIPLE_CHOICE'
    ),
    count(*) filter (
      where question.question_type = 'NUMBER_INPUT'
    ),
    count(distinct question.skill_code)
  into
    v_question_count,
    v_mcq_count,
    v_number_count,
    v_skill_group_count
  from public.questions as question
  where question.unit_slug = 'grade-1-addition-within-10';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-addition-within-10';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_skill_group_count <> 4
  then
    raise exception 'Grade 1 addition seed count validation failed';
  end if;

  if exists (
    select 1
    from (
      select
        question.skill_code,
        count(*) as question_count
      from public.questions as question
      where question.unit_slug = 'grade-1-addition-within-10'
      group by question.skill_code
    ) as skill
    where skill.question_count <> 6
  ) then
    raise exception 'Grade 1 addition skill distribution validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where
      question.unit_slug = 'grade-1-addition-within-10'
      and (
        not question.published
        or jsonb_array_length(solution.solution_steps) < 2
        or (
          question.question_type = 'MULTIPLE_CHOICE'
          and (
            jsonb_typeof(question.options) <> 'object'
            or not (
              question.options ?& array['A', 'B', 'C', 'D']
            )
            or (
              question.options
              - array['A', 'B', 'C', 'D']::text[]
            ) <> '{}'::jsonb
            or not (question.options ? solution.correct_answer)
          )
        )
        or (
          question.question_type = 'NUMBER_INPUT'
          and (
            question.options is not null
            or solution.correct_answer !~ '^([0-9]|10)$'
          )
        )
      )
  ) then
    raise exception 'Grade 1 addition content validation failed';
  end if;

  if (
    select count(distinct question.prompt)
    from public.questions as question
    where question.unit_slug = 'grade-1-addition-within-10'
  ) <> 24 then
    raise exception 'Grade 1 addition duplicate prompt validation failed';
  end if;

  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_function_definition
  from pg_catalog.pg_proc as procedure
  where
    procedure.pronamespace = 'public'::regnamespace
    and procedure.proname = 'start_or_resume_practice'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_unit_slug text';

  if
    v_function_definition is null
    or v_function_definition !~ 'prerequisite_unit_slug'
    or v_function_definition !~ 'Prerequisite required'
    or v_function_definition !~ 'profile[.]role = ''STUDENT'''
    or v_function_definition !~ 'profile[.]onboarding_completed'
    or v_function_definition !~ 'attempt[.]student_id = v_current_user_id'
  then
    raise exception 'Practice prerequisite authorization validation failed';
  end if;

  if
    has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
    or has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    or not has_function_privilege(
      'authenticated',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or exists (
      select 1
      from pg_catalog.pg_proc as procedure
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          procedure.proacl,
          pg_catalog.acldefault('f', procedure.proowner)
        )
      ) as privilege
      where
        procedure.oid =
          'public.start_or_resume_practice(text)'::regprocedure
        and privilege.grantee = 0
        and privilege.privilege_type = 'EXECUTE'
    )
  then
    raise exception 'Practice permission validation failed';
  end if;
end;
$validation$;

commit;
