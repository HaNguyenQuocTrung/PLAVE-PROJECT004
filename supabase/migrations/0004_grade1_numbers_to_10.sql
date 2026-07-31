begin;

create table public.learning_units (
  slug text primary key,
  grade smallint not null check (grade between 1 and 9),
  title text not null,
  description text not null,
  learning_objectives jsonb not null,
  lesson_content jsonb not null,
  total_questions smallint not null check (total_questions = 24),
  published boolean not null default false,
  display_order smallint not null check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_units_slug_check check (
    slug = lower(btrim(slug))
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint learning_units_title_check check (
    title = btrim(title) and char_length(title) between 3 and 120
  ),
  constraint learning_units_description_check check (
    description = btrim(description)
    and char_length(description) between 10 and 300
  ),
  constraint learning_units_objectives_check check (
    jsonb_typeof(learning_objectives) = 'array'
    and jsonb_array_length(learning_objectives) > 0
  ),
  constraint learning_units_content_check check (
    jsonb_typeof(lesson_content) = 'object'
  )
);

create table public.questions (
  code text primary key,
  unit_slug text not null
    references public.learning_units(slug) on delete cascade,
  question_type text not null
    check (question_type in ('MULTIPLE_CHOICE', 'NUMBER_INPUT')),
  prompt text not null,
  options jsonb,
  skill_code text not null check (
    skill_code in (
      'COUNT_RECOGNIZE',
      'READ_WRITE_MATCH',
      'SEQUENCE_COMPARE_ORDER',
      'COMPOSE_DECOMPOSE'
    )
  ),
  difficulty text not null check (difficulty in ('EASY', 'MEDIUM')),
  display_order smallint not null check (display_order between 1 and 24),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_code_check check (
    code = lower(btrim(code))
    and code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint questions_prompt_check check (
    prompt = btrim(prompt) and char_length(prompt) between 8 and 300
  ),
  constraint questions_options_check check (
    (
      question_type = 'MULTIPLE_CHOICE'
      and options is not null
      and jsonb_typeof(options) = 'object'
      and options ?& array['A', 'B', 'C', 'D']
      and (
        options - array['A', 'B', 'C', 'D']::text[]
      ) = '{}'::jsonb
      and jsonb_typeof(options -> 'A') = 'string'
      and jsonb_typeof(options -> 'B') = 'string'
      and jsonb_typeof(options -> 'C') = 'string'
      and jsonb_typeof(options -> 'D') = 'string'
      and btrim(options ->> 'A') <> ''
      and btrim(options ->> 'B') <> ''
      and btrim(options ->> 'C') <> ''
      and btrim(options ->> 'D') <> ''
    )
    or (
      question_type = 'NUMBER_INPUT'
      and options is null
    )
  ),
  unique (unit_slug, display_order),
  unique (unit_slug, prompt)
);

create table public.question_solutions (
  question_id text primary key
    references public.questions(code) on delete cascade,
  correct_answer text not null,
  solution_steps jsonb not null,
  explanation text not null,
  hint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_solutions_answer_check check (
    correct_answer = upper(btrim(correct_answer))
    and char_length(correct_answer) between 1 and 20
  ),
  constraint question_solutions_steps_check check (
    jsonb_typeof(solution_steps) = 'array'
    and jsonb_array_length(solution_steps) >= 2
  ),
  constraint question_solutions_explanation_check check (
    explanation = btrim(explanation)
    and char_length(explanation) between 8 and 500
  ),
  constraint question_solutions_hint_check check (
    hint = btrim(hint) and char_length(hint) between 8 and 300
  )
);

create table public.practice_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.student_profiles(user_id) on delete cascade,
  unit_slug text not null
    references public.learning_units(slug) on delete restrict,
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS', 'COMPLETED')),
  question_order text[] not null,
  total_questions smallint not null default 24
    check (total_questions = 24),
  answered_count smallint not null default 0
    check (answered_count between 0 and 24),
  correct_count smallint not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint practice_attempts_question_order_check check (
    cardinality(question_order) = 24
    and array_position(question_order, null) is null
  ),
  constraint practice_attempts_score_check check (
    correct_count between 0 and answered_count
  ),
  constraint practice_attempts_completion_check check (
    (
      status = 'IN_PROGRESS'
      and completed_at is null
      and answered_count < 24
    )
    or (
      status = 'COMPLETED'
      and completed_at is not null
      and answered_count = 24
    )
  )
);

create table public.practice_answers (
  attempt_id uuid not null
    references public.practice_attempts(id) on delete cascade,
  question_id text not null
    references public.questions(code) on delete restrict,
  normalized_answer text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  constraint practice_answers_normalized_answer_check check (
    normalized_answer = upper(btrim(normalized_answer))
    and char_length(normalized_answer) between 1 and 20
  )
);

create unique index practice_attempts_one_in_progress_idx
  on public.practice_attempts (student_id, unit_slug)
  where status = 'IN_PROGRESS';

create index practice_attempts_student_started_idx
  on public.practice_attempts (student_id, started_at desc);

create index questions_unit_published_order_idx
  on public.questions (unit_slug, published, display_order);

create trigger learning_units_set_updated_at
before update on public.learning_units
for each row execute function private.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function private.set_updated_at();

create trigger question_solutions_set_updated_at
before update on public.question_solutions
for each row execute function private.set_updated_at();

create trigger practice_attempts_set_updated_at
before update on public.practice_attempts
for each row execute function private.set_updated_at();

insert into public.learning_units (
  slug,
  grade,
  title,
  description,
  learning_objectives,
  lesson_content,
  total_questions,
  published,
  display_order
)
values (
  'grade-1-numbers-to-10',
  1,
  'Các số trong phạm vi 10',
  'Đếm, đọc, viết, so sánh và tìm hiểu cấu tạo các số từ 0 đến 10.',
  $objectives$[
    "Đếm đúng số lượng đồ vật từ 0 đến 10.",
    "Đọc và viết đúng các chữ số từ 0 đến 10.",
    "Tìm được số liền trước và số liền sau.",
    "So sánh và sắp xếp các số trong phạm vi 10.",
    "Tách và gộp một số thành hai phần."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "numbers",
        "title": "Các số từ 0 đến 10",
        "paragraphs": [
          "Các chữ số giúp em ghi lại số lượng. Em học các số 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 và 10.",
          "Số 0 cho biết không có đồ vật nào. Số 10 gồm hai chữ số là 1 và 0."
        ]
      },
      {
        "code": "count",
        "title": "Đếm số lượng đồ vật",
        "paragraphs": [
          "Em chỉ vào từng đồ vật và đọc lần lượt 1, 2, 3, ...",
          "Số cuối cùng em đọc chính là số lượng đồ vật."
        ]
      },
      {
        "code": "read-write",
        "title": "Đọc và viết chữ số",
        "paragraphs": [
          "Mỗi số có một cách đọc và cách viết. Ví dụ: chữ số 4 đọc là bốn, chữ số 9 đọc là chín.",
          "Khi nghe tên một số, em chọn hoặc viết chữ số tương ứng."
        ]
      },
      {
        "code": "neighbors",
        "title": "Số liền trước và số liền sau",
        "paragraphs": [
          "Số liền trước đứng ngay bên trái một số trên dãy số.",
          "Số liền sau đứng ngay bên phải một số trên dãy số."
        ]
      },
      {
        "code": "compare",
        "title": "So sánh các số",
        "paragraphs": [
          "Dấu > nghĩa là lớn hơn, dấu < nghĩa là bé hơn và dấu = nghĩa là bằng nhau.",
          "Em có thể đếm hoặc nhìn vị trí trên dãy số để so sánh."
        ]
      },
      {
        "code": "compose",
        "title": "Tách và gộp số",
        "paragraphs": [
          "Một số có thể được tách thành hai phần. Ví dụ: 5 gồm 2 và 3.",
          "Khi gộp hai nhóm, em đếm tất cả đồ vật để tìm số mới."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Ví dụ 1: So sánh 4 và 7",
        "steps": [
          "Bước 1: Đếm 4 chấm và 7 chấm.",
          "Bước 2: Nhóm 4 chấm ít hơn nhóm 7 chấm.",
          "Bước 3: Điền dấu <: 4 < 7."
        ],
        "answer": "4 < 7"
      },
      {
        "title": "Ví dụ 2: Tách số 8",
        "steps": [
          "Bước 1: Lấy một nhóm 3 que tính.",
          "Bước 2: Đếm thêm 5 que tính.",
          "Bước 3: Gộp hai nhóm được 8 que tính, nên 8 gồm 3 và 5."
        ],
        "answer": "8 gồm 3 và 5"
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  1
);

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
values
  (
    'g1-n10-q01',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Có 3 chấm tròn: ● ● ●. Có bao nhiêu chấm tròn?',
    '{"A":"1","B":"2","C":"3","D":"4"}'::jsonb,
    'COUNT_RECOGNIZE',
    'EASY',
    1,
    true
  ),
  (
    'g1-n10-q02',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Có 5 ngôi sao: ★ ★ ★ ★ ★. Có bao nhiêu ngôi sao?',
    '{"A":"3","B":"4","C":"5","D":"6"}'::jsonb,
    'COUNT_RECOGNIZE',
    'EASY',
    2,
    true
  ),
  (
    'g1-n10-q03',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Nhóm nào có đúng 7 hình tròn?',
    '{"A":"● ● ● ● ● ● ●","B":"● ● ● ● ● ●","C":"● ● ● ● ● ● ● ●","D":"● ● ● ● ●"}'::jsonb,
    'COUNT_RECOGNIZE',
    'EASY',
    3,
    true
  ),
  (
    'g1-n10-q04',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Có 8 quả bóng. Chữ số nào chỉ số lượng quả bóng?',
    '{"A":"6","B":"8","C":"9","D":"10"}'::jsonb,
    'COUNT_RECOGNIZE',
    'EASY',
    4,
    true
  ),
  (
    'g1-n10-q05',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Đếm các hình tam giác: ▲ ▲ ▲ ▲ ▲ ▲. Em hãy nhập số.',
    null,
    'COUNT_RECOGNIZE',
    'EASY',
    5,
    true
  ),
  (
    'g1-n10-q06',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Có 10 que tính. Em hãy nhập chữ số chỉ số que tính.',
    null,
    'COUNT_RECOGNIZE',
    'EASY',
    6,
    true
  ),
  (
    'g1-n10-q07',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Từ “bốn” ứng với chữ số nào?',
    '{"A":"3","B":"4","C":"5","D":"6"}'::jsonb,
    'READ_WRITE_MATCH',
    'EASY',
    7,
    true
  ),
  (
    'g1-n10-q08',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Chữ số 9 được đọc là gì?',
    '{"A":"bảy","B":"tám","C":"chín","D":"mười"}'::jsonb,
    'READ_WRITE_MATCH',
    'EASY',
    8,
    true
  ),
  (
    'g1-n10-q09',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Nhóm chấm tròn nào ứng với chữ số 2?',
    '{"A":"●","B":"● ●","C":"● ● ●","D":"● ● ● ●"}'::jsonb,
    'READ_WRITE_MATCH',
    'EASY',
    9,
    true
  ),
  (
    'g1-n10-q10',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Cách viết bằng chữ số nào đúng cho từ “mười”?',
    '{"A":"0","B":"1","C":"9","D":"10"}'::jsonb,
    'READ_WRITE_MATCH',
    'EASY',
    10,
    true
  ),
  (
    'g1-n10-q11',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Viết bằng chữ số: sáu.',
    null,
    'READ_WRITE_MATCH',
    'EASY',
    11,
    true
  ),
  (
    'g1-n10-q12',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Có 8 chấm vuông: ■ ■ ■ ■ ■ ■ ■ ■. Em hãy nhập chữ số.',
    null,
    'READ_WRITE_MATCH',
    'EASY',
    12,
    true
  ),
  (
    'g1-n10-q13',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Số liền sau của 4 là số nào?',
    '{"A":"3","B":"4","C":"5","D":"6"}'::jsonb,
    'SEQUENCE_COMPARE_ORDER',
    'EASY',
    13,
    true
  ),
  (
    'g1-n10-q14',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Số liền trước của 7 là số nào?',
    '{"A":"5","B":"6","C":"7","D":"8"}'::jsonb,
    'SEQUENCE_COMPARE_ORDER',
    'EASY',
    14,
    true
  ),
  (
    'g1-n10-q15',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Chọn dấu đúng để điền vào ô trống: 3 □ 6.',
    '{"A":">","B":"<","C":"=","D":"Không có dấu phù hợp"}'::jsonb,
    'SEQUENCE_COMPARE_ORDER',
    'MEDIUM',
    15,
    true
  ),
  (
    'g1-n10-q16',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Dãy số nào được sắp xếp từ bé đến lớn?',
    '{"A":"2, 4, 6","B":"6, 4, 2","C":"2, 6, 4","D":"4, 2, 6"}'::jsonb,
    'SEQUENCE_COMPARE_ORDER',
    'MEDIUM',
    16,
    true
  ),
  (
    'g1-n10-q17',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Em hãy nhập số liền sau của 9.',
    null,
    'SEQUENCE_COMPARE_ORDER',
    'EASY',
    17,
    true
  ),
  (
    'g1-n10-q18',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Em hãy nhập số liền trước của 1.',
    null,
    'SEQUENCE_COMPARE_ORDER',
    'EASY',
    18,
    true
  ),
  (
    'g1-n10-q19',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Số 5 gồm 2 và mấy?',
    '{"A":"2","B":"3","C":"4","D":"5"}'::jsonb,
    'COMPOSE_DECOMPOSE',
    'EASY',
    19,
    true
  ),
  (
    'g1-n10-q20',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Cách tách nào đúng cho số 8?',
    '{"A":"3 và 5","B":"2 và 5","C":"4 và 3","D":"6 và 3"}'::jsonb,
    'COMPOSE_DECOMPOSE',
    'MEDIUM',
    20,
    true
  ),
  (
    'g1-n10-q21',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Gộp 4 chấm tròn và 2 chấm tròn được bao nhiêu chấm tròn?',
    '{"A":"5","B":"6","C":"7","D":"8"}'::jsonb,
    'COMPOSE_DECOMPOSE',
    'EASY',
    21,
    true
  ),
  (
    'g1-n10-q22',
    'grade-1-numbers-to-10',
    'MULTIPLE_CHOICE',
    'Số 10 gồm 6 và mấy?',
    '{"A":"2","B":"3","C":"4","D":"5"}'::jsonb,
    'COMPOSE_DECOMPOSE',
    'MEDIUM',
    22,
    true
  ),
  (
    'g1-n10-q23',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Số 7 gồm 5 và mấy? Em hãy nhập số còn thiếu.',
    null,
    'COMPOSE_DECOMPOSE',
    'EASY',
    23,
    true
  ),
  (
    'g1-n10-q24',
    'grade-1-numbers-to-10',
    'NUMBER_INPUT',
    'Gộp 3 que tính và 4 que tính được bao nhiêu que tính?',
    null,
    'COMPOSE_DECOMPOSE',
    'EASY',
    24,
    true
  );

insert into public.question_solutions (
  question_id,
  correct_answer,
  solution_steps,
  explanation,
  hint
)
values
  (
    'g1-n10-q01',
    'C',
    '["Bước 1: Chỉ vào từng chấm tròn và đếm 1, 2, 3.","Bước 2: Có 3 chấm tròn, nên chọn đáp án C."]'::jsonb,
    'Số cuối cùng khi đếm là 3.',
    'Em hãy chỉ vào từng chấm tròn và đếm chậm.'
  ),
  (
    'g1-n10-q02',
    'C',
    '["Bước 1: Đếm lần lượt năm ngôi sao.","Bước 2: Có 5 ngôi sao, nên chọn đáp án C."]'::jsonb,
    'Nhóm hình có tất cả 5 ngôi sao.',
    'Em hãy đánh dấu mỗi ngôi sao sau khi đếm.'
  ),
  (
    'g1-n10-q03',
    'A',
    '["Bước 1: Đếm số hình tròn trong từng lựa chọn.","Bước 2: Lựa chọn A có đúng 7 hình tròn."]'::jsonb,
    'Chỉ nhóm A có số lượng bằng 7.',
    'Tìm nhóm mà số cuối cùng em đếm được là 7.'
  ),
  (
    'g1-n10-q04',
    'B',
    '["Bước 1: Số lượng đã cho là 8 quả bóng.","Bước 2: Chữ số biểu thị số lượng 8 là đáp án B."]'::jsonb,
    'Chữ số 8 dùng để ghi số lượng tám đồ vật.',
    'Đọc lại số lượng quả bóng rồi tìm chữ số giống số đó.'
  ),
  (
    'g1-n10-q05',
    '6',
    '["Bước 1: Chỉ vào từng hình tam giác và đếm từ 1.","Bước 2: Số cuối cùng là 6, nên nhập 6."]'::jsonb,
    'Có tất cả 6 hình tam giác.',
    'Em hãy đếm lại và không bỏ qua hình nào.'
  ),
  (
    'g1-n10-q06',
    '10',
    '["Bước 1: Đề bài cho biết có 10 que tính.","Bước 2: Chữ số cần nhập là 10."]'::jsonb,
    'Mười que tính được viết bằng số 10.',
    'Số mười gồm chữ số 1 đứng trước chữ số 0.'
  ),
  (
    'g1-n10-q07',
    'B',
    '["Bước 1: Đọc từ bốn.","Bước 2: Từ bốn được viết bằng chữ số 4, là đáp án B."]'::jsonb,
    'Tên số bốn tương ứng với chữ số 4.',
    'Em hãy đọc lần lượt các số 3, 4, 5, 6.'
  ),
  (
    'g1-n10-q08',
    'C',
    '["Bước 1: Nhìn chữ số 9.","Bước 2: Chữ số 9 đọc là chín, nên chọn C."]'::jsonb,
    'Cách đọc đúng của 9 là chín.',
    'Đếm dãy số đến số đứng ngay trước 10.'
  ),
  (
    'g1-n10-q09',
    'B',
    '["Bước 1: Chữ số cần ghép là 2.","Bước 2: Nhóm B có đúng 2 chấm tròn."]'::jsonb,
    'Hai chấm tròn biểu thị số lượng 2.',
    'Đếm số chấm trong từng nhóm và dừng ở 2.'
  ),
  (
    'g1-n10-q10',
    'D',
    '["Bước 1: Đọc từ mười.","Bước 2: Mười được viết là 10, nên chọn D."]'::jsonb,
    'Số mười được viết bằng hai chữ số 1 và 0.',
    'Tìm lựa chọn có chữ số 1 đứng trước chữ số 0.'
  ),
  (
    'g1-n10-q11',
    '6',
    '["Bước 1: Đọc từ sáu.","Bước 2: Từ sáu được viết bằng chữ số 6."]'::jsonb,
    'Tên số sáu tương ứng với chữ số 6.',
    'Đếm từ 1 đến sáu rồi viết số cuối cùng.'
  ),
  (
    'g1-n10-q12',
    '8',
    '["Bước 1: Đếm lần lượt các chấm vuông từ 1 đến 8.","Bước 2: Có 8 chấm vuông, nên nhập 8."]'::jsonb,
    'Số lượng chấm vuông là 8.',
    'Em hãy chỉ vào từng chấm vuông khi đếm.'
  ),
  (
    'g1-n10-q13',
    'C',
    '["Bước 1: Tìm số 4 trên dãy số.","Bước 2: Số đứng ngay sau 4 là 5, nên chọn C."]'::jsonb,
    'Số liền sau của 4 là 5.',
    'Đếm tiếp một số sau 4.'
  ),
  (
    'g1-n10-q14',
    'B',
    '["Bước 1: Tìm số 7 trên dãy số.","Bước 2: Số đứng ngay trước 7 là 6, nên chọn B."]'::jsonb,
    'Số liền trước của 7 là 6.',
    'Đếm lùi một số từ 7.'
  ),
  (
    'g1-n10-q15',
    'B',
    '["Bước 1: So sánh 3 đồ vật với 6 đồ vật.","Bước 2: 3 bé hơn 6, nên điền dấu < và chọn B."]'::jsonb,
    'Dấu < cho biết số bên trái bé hơn số bên phải.',
    'Số 3 đứng trước số 6 trên dãy số.'
  ),
  (
    'g1-n10-q16',
    'A',
    '["Bước 1: Bắt đầu từ số bé nhất là 2.","Bước 2: Tiếp theo là 4 rồi 6, nên chọn dãy 2, 4, 6."]'::jsonb,
    'Dãy 2, 4, 6 tăng dần từ bé đến lớn.',
    'Tìm dãy có mỗi số sau lớn hơn số trước.'
  ),
  (
    'g1-n10-q17',
    '10',
    '["Bước 1: Tìm số 9 trên dãy số.","Bước 2: Đếm tiếp một số được 10, nên nhập 10."]'::jsonb,
    'Số liền sau của 9 là 10.',
    'Đọc tiếp một số sau chín.'
  ),
  (
    'g1-n10-q18',
    '0',
    '["Bước 1: Tìm số 1 trên dãy số.","Bước 2: Số đứng ngay trước 1 là 0, nên nhập 0."]'::jsonb,
    'Số liền trước của 1 là 0.',
    'Đếm lùi một số từ 1.'
  ),
  (
    'g1-n10-q19',
    'B',
    '["Bước 1: Bắt đầu với 2 phần trong tổng số 5.","Bước 2: Đếm thêm 3 để được 5, nên chọn B."]'::jsonb,
    'Hai và ba gộp lại được năm.',
    'Đếm tiếp từ 2 cho đến 5.'
  ),
  (
    'g1-n10-q20',
    'A',
    '["Bước 1: Kiểm tra từng cặp bằng cách gộp hai phần.","Bước 2: 3 và 5 gộp lại được 8, nên chọn A."]'::jsonb,
    'Số 8 có thể tách thành 3 và 5.',
    'Đếm 3 đồ vật rồi thêm 5 đồ vật.'
  ),
  (
    'g1-n10-q21',
    'B',
    '["Bước 1: Đếm nhóm đầu có 4 chấm tròn.","Bước 2: Thêm 2 chấm tròn được 6, nên chọn B."]'::jsonb,
    'Bốn và hai gộp lại được sáu.',
    'Bắt đầu từ 4 rồi đếm thêm hai số.'
  ),
  (
    'g1-n10-q22',
    'C',
    '["Bước 1: Bắt đầu với 6 phần trong tổng số 10.","Bước 2: Cần thêm 4 để được 10, nên chọn C."]'::jsonb,
    'Sáu và bốn gộp lại được mười.',
    'Đếm tiếp từ 6 đến 10.'
  ),
  (
    'g1-n10-q23',
    '2',
    '["Bước 1: Bắt đầu với 5 phần trong tổng số 7.","Bước 2: Đếm thêm 2 để được 7, nên nhập 2."]'::jsonb,
    'Năm và hai gộp lại được bảy.',
    'Đếm tiếp hai bước từ 5.'
  ),
  (
    'g1-n10-q24',
    '7',
    '["Bước 1: Đếm nhóm đầu có 3 que tính.","Bước 2: Thêm 4 que tính được tất cả 7 que tính."]'::jsonb,
    'Ba và bốn gộp lại được bảy.',
    'Bắt đầu từ 3 rồi đếm thêm bốn số.'
  );

-- Fail closed if the single seeded lesson is incomplete or internally invalid.
do $content_validation$
declare
  v_unit_count bigint;
  v_question_count bigint;
  v_published_count bigint;
  v_mcq_count bigint;
  v_number_count bigint;
  v_solution_count bigint;
  v_invalid_options_count bigint;
  v_invalid_answer_count bigint;
  v_invalid_skill_count bigint;
  v_skill_group_count bigint;
  v_placeholder_count bigint;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as u
  where u.slug = 'grade-1-numbers-to-10'
    and u.grade = 1
    and u.published
    and u.total_questions = 24
    and jsonb_array_length(u.learning_objectives) >= 1
    and jsonb_array_length(u.lesson_content -> 'sections') >= 6
    and jsonb_array_length(u.lesson_content -> 'worked_examples') >= 2;

  if v_unit_count <> 1 then
    raise exception 'Invalid seeded learning unit';
  end if;

  select
    count(*),
    count(*) filter (where q.published),
    count(*) filter (where q.question_type = 'MULTIPLE_CHOICE'),
    count(*) filter (where q.question_type = 'NUMBER_INPUT')
  into
    v_question_count,
    v_published_count,
    v_mcq_count,
    v_number_count
  from public.questions as q
  where q.unit_slug = 'grade-1-numbers-to-10';

  if
    v_question_count <> 24
    or v_published_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
  then
    raise exception 'Invalid seeded question counts';
  end if;

  select count(*)
  into v_solution_count
  from public.question_solutions as s
  join public.questions as q on q.code = s.question_id
  where q.unit_slug = 'grade-1-numbers-to-10';

  if v_solution_count <> 24 then
    raise exception 'Invalid seeded solution count';
  end if;

  select count(*)
  into v_invalid_options_count
  from public.questions as q
  where q.unit_slug = 'grade-1-numbers-to-10'
    and q.question_type = 'MULTIPLE_CHOICE'
    and (
      jsonb_typeof(q.options) <> 'object'
      or not (q.options ?& array['A', 'B', 'C', 'D'])
      or (
        q.options - array['A', 'B', 'C', 'D']::text[]
      ) <> '{}'::jsonb
    );

  if v_invalid_options_count <> 0 then
    raise exception 'Invalid seeded options';
  end if;

  select count(*)
  into v_invalid_answer_count
  from public.questions as q
  join public.question_solutions as s on s.question_id = q.code
  where q.unit_slug = 'grade-1-numbers-to-10'
    and (
      (
        q.question_type = 'MULTIPLE_CHOICE'
        and not (q.options ? s.correct_answer)
      )
      or (
        q.question_type = 'NUMBER_INPUT'
        and not (s.correct_answer ~ '^(0|[1-9]|10)$')
      )
      or jsonb_array_length(s.solution_steps) < 2
    );

  if v_invalid_answer_count <> 0 then
    raise exception 'Invalid seeded answers';
  end if;

  select
    count(*) filter (where skill_count <> 6),
    count(*)
  into
    v_invalid_skill_count,
    v_skill_group_count
  from (
    select q.skill_code, count(*) as skill_count
    from public.questions as q
    where q.unit_slug = 'grade-1-numbers-to-10'
    group by q.skill_code
  ) as skill_totals;

  if v_invalid_skill_count <> 0 or v_skill_group_count <> 4 then
    raise exception 'Invalid seeded skill distribution';
  end if;

  select count(*)
  into v_placeholder_count
  from (
    select
      q.prompt
      || ' '
      || coalesce(q.options::text, '')
      || ' '
      || s.solution_steps::text
      || ' '
      || s.explanation
      || ' '
      || s.hint as content_text
    from public.questions as q
    join public.question_solutions as s on s.question_id = q.code
    where q.unit_slug = 'grade-1-numbers-to-10'

    union all

    select
      u.title
      || ' '
      || u.description
      || ' '
      || u.learning_objectives::text
      || ' '
      || u.lesson_content::text as content_text
    from public.learning_units as u
    where u.slug = 'grade-1-numbers-to-10'
  ) as seeded_content
  where lower(seeded_content.content_text) ~ '(todo|placeholder|lorem)';

  if v_placeholder_count <> 0 then
    raise exception 'Seeded content contains placeholders';
  end if;
end;
$content_validation$;

alter table public.learning_units enable row level security;
alter table public.questions enable row level security;
alter table public.question_solutions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.practice_answers enable row level security;

revoke all on table public.learning_units from public;
revoke all on table public.questions from public;
revoke all on table public.question_solutions from public;
revoke all on table public.practice_attempts from public;
revoke all on table public.practice_answers from public;

revoke all on table public.learning_units from anon;
revoke all on table public.questions from anon;
revoke all on table public.question_solutions from anon;
revoke all on table public.practice_attempts from anon;
revoke all on table public.practice_answers from anon;

revoke all on table public.learning_units from authenticated;
revoke all on table public.questions from authenticated;
revoke all on table public.question_solutions from authenticated;
revoke all on table public.practice_attempts from authenticated;
revoke all on table public.practice_answers from authenticated;

grant select on table public.learning_units to authenticated;
grant select on table public.questions to authenticated;
grant select on table public.practice_attempts to authenticated;
grant select on table public.practice_answers to authenticated;

create policy learning_units_select_published
on public.learning_units
for select
to authenticated
using (published);

create policy questions_select_published
on public.questions
for select
to authenticated
using (
  published
  and exists (
    select 1
    from public.learning_units as u
    where u.slug = questions.unit_slug
      and u.published
  )
);

create policy practice_attempts_select_own
on public.practice_attempts
for select
to authenticated
using (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles as p
    where p.user_id = (select auth.uid())
      and p.role = 'STUDENT'
      and p.onboarding_completed
  )
);

create policy practice_answers_select_own
on public.practice_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.practice_attempts as pa
    join public.profiles as p on p.user_id = pa.student_id
    where pa.id = practice_answers.attempt_id
      and pa.student_id = (select auth.uid())
      and p.role = 'STUDENT'
      and p.onboarding_completed
  )
);

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
  v_unit_count bigint := 0;
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

  select count(*)
  into v_student_count
  from public.profiles as p
  join public.student_profiles as sp on sp.user_id = p.user_id
  where p.user_id = v_current_user_id
    and p.role = 'STUDENT'
    and p.onboarding_completed
    and sp.grade = 1;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  select count(*)
  into v_unit_count
  from public.learning_units as u
  where u.slug = v_normalized_unit_slug
    and u.grade = 1
    and u.published
    and u.total_questions = 24;

  if v_unit_count <> 1 then
    raise exception 'Unit unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_current_user_id::text || ':' || v_normalized_unit_slug,
      0
    )
  );

  select
    pa.id,
    pa.status,
    pa.question_order,
    pa.total_questions,
    pa.answered_count,
    pa.correct_count,
    pa.started_at
  into
    v_attempt_id,
    v_attempt_status,
    v_question_order,
    v_total_questions,
    v_answered_count,
    v_correct_count,
    v_started_at
  from public.practice_attempts as pa
  where pa.student_id = v_current_user_id
    and pa.unit_slug = v_normalized_unit_slug
    and pa.status = 'IN_PROGRESS'
  order by pa.started_at desc
  limit 1;

  if v_attempt_id is null then
    select array_agg(q.code order by random())
    into v_question_order
    from public.questions as q
    join public.question_solutions as s on s.question_id = q.code
    where q.unit_slug = v_normalized_unit_slug
      and q.published;

    if coalesce(cardinality(v_question_order), 0) <> 24 then
      raise exception 'Unit unavailable';
    end if;

    v_attempt_id := extensions.gen_random_uuid();
    v_attempt_status := 'IN_PROGRESS';
    v_total_questions := 24;
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

create or replace function public.submit_practice_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_attempt_status text;
  v_unit_slug text;
  v_question_order text[];
  v_question_type text;
  v_normalized_answer text;
  v_correct_answer text;
  v_solution_steps jsonb;
  v_explanation text;
  v_hint text;
  v_is_correct boolean;
  v_existing_answer_count bigint := 0;
  v_answered_count bigint := 0;
  v_correct_count bigint := 0;
  v_completed boolean := false;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'Practice unavailable';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as p
  join public.student_profiles as sp on sp.user_id = p.user_id
  where p.user_id = v_current_user_id
    and p.role = 'STUDENT'
    and p.onboarding_completed;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_attempt_id::text, 1)
  );

  select
    pa.status,
    pa.unit_slug,
    pa.question_order,
    pa.answered_count,
    pa.correct_count
  into
    v_attempt_status,
    v_unit_slug,
    v_question_order,
    v_answered_count,
    v_correct_count
  from public.practice_attempts as pa
  where pa.id = p_attempt_id
    and pa.student_id = v_current_user_id;

  if v_attempt_status is null then
    raise exception 'Practice unavailable';
  end if;

  select count(*)
  into v_existing_answer_count
  from public.practice_answers as a
  where a.attempt_id = p_attempt_id
    and a.question_id = p_question_id;

  if v_existing_answer_count = 1 then
    select
      a.is_correct,
      s.correct_answer,
      s.solution_steps,
      s.explanation,
      s.hint
    into
      v_is_correct,
      v_correct_answer,
      v_solution_steps,
      v_explanation,
      v_hint
    from public.practice_answers as a
    join public.question_solutions as s
      on s.question_id = a.question_id
    where a.attempt_id = p_attempt_id
      and a.question_id = p_question_id;

    return pg_catalog.jsonb_build_object(
      'is_correct', v_is_correct,
      'correct_answer', v_correct_answer,
      'solution_steps', v_solution_steps,
      'explanation', v_explanation,
      'hint', v_hint,
      'answered_count', v_answered_count,
      'correct_count', v_correct_count,
      'completed', v_attempt_status = 'COMPLETED'
    );
  end if;

  if v_attempt_status <> 'IN_PROGRESS' then
    raise exception 'Practice unavailable';
  end if;

  if
    p_question_id is null
    or not (p_question_id = any(v_question_order))
  then
    raise exception 'Question unavailable';
  end if;

  select
    q.question_type,
    s.correct_answer,
    s.solution_steps,
    s.explanation,
    s.hint
  into
    v_question_type,
    v_correct_answer,
    v_solution_steps,
    v_explanation,
    v_hint
  from public.questions as q
  join public.question_solutions as s on s.question_id = q.code
  where q.code = p_question_id
    and q.unit_slug = v_unit_slug
    and q.published;

  if v_question_type is null then
    raise exception 'Question unavailable';
  end if;

  if p_answer is null or char_length(p_answer) not between 1 and 20 then
    raise exception 'Invalid answer';
  end if;

  if v_question_type = 'MULTIPLE_CHOICE' then
    v_normalized_answer := upper(btrim(p_answer));
    if v_normalized_answer !~ '^[A-D]$' then
      raise exception 'Invalid answer';
    end if;
  elsif v_question_type = 'NUMBER_INPUT' then
    v_normalized_answer := btrim(p_answer);
    if
      v_normalized_answer !~ '^[0-9]{1,2}$'
      or v_normalized_answer::integer not between 0 and 10
    then
      raise exception 'Invalid answer';
    end if;
    v_normalized_answer := v_normalized_answer::integer::text;
  else
    raise exception 'Question unavailable';
  end if;

  v_is_correct := v_normalized_answer = v_correct_answer;

  insert into public.practice_answers (
    attempt_id,
    question_id,
    normalized_answer,
    is_correct
  )
  values (
    p_attempt_id,
    p_question_id,
    v_normalized_answer,
    v_is_correct
  );

  select
    count(*),
    count(*) filter (where a.is_correct)
  into
    v_answered_count,
    v_correct_count
  from public.practice_answers as a
  where a.attempt_id = p_attempt_id;

  v_completed := v_answered_count = 24;

  update public.practice_attempts as pa
    set answered_count = v_answered_count::smallint,
        correct_count = v_correct_count::smallint,
        status = case
          when v_completed then 'COMPLETED'
          else 'IN_PROGRESS'
        end,
        completed_at = case
          when v_completed then now()
          else null
        end
    where pa.id = p_attempt_id
      and pa.student_id = v_current_user_id;

  return pg_catalog.jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_answer', v_correct_answer,
    'solution_steps', v_solution_steps,
    'explanation', v_explanation,
    'hint', v_hint,
    'answered_count', v_answered_count,
    'correct_count', v_correct_count,
    'completed', v_completed
  );
end;
$$;

create or replace function public.get_practice_review(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_student_count bigint := 0;
  v_attempt_status text;
  v_unit_slug text;
  v_question_order text[];
  v_total_questions smallint;
  v_answered_count smallint;
  v_correct_count smallint;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_review_items jsonb;
begin
  if v_current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_attempt_id is null then
    raise exception 'Practice unavailable';
  end if;

  select count(*)
  into v_student_count
  from public.profiles as p
  join public.student_profiles as sp on sp.user_id = p.user_id
  where p.user_id = v_current_user_id
    and p.role = 'STUDENT'
    and p.onboarding_completed;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  select
    pa.status,
    pa.unit_slug,
    pa.question_order,
    pa.total_questions,
    pa.answered_count,
    pa.correct_count,
    pa.started_at,
    pa.completed_at
  into
    v_attempt_status,
    v_unit_slug,
    v_question_order,
    v_total_questions,
    v_answered_count,
    v_correct_count,
    v_started_at,
    v_completed_at
  from public.practice_attempts as pa
  where pa.id = p_attempt_id
    and pa.student_id = v_current_user_id;

  if v_attempt_status is null then
    raise exception 'Practice unavailable';
  end if;

  select coalesce(
    jsonb_agg(
      pg_catalog.jsonb_build_object(
        'question_id', q.code,
        'question_type', q.question_type,
        'prompt', q.prompt,
        'options', q.options,
        'skill_code', q.skill_code,
        'student_answer', a.normalized_answer,
        'is_correct', a.is_correct,
        'correct_answer', s.correct_answer,
        'solution_steps', s.solution_steps,
        'explanation', s.explanation,
        'hint', s.hint,
        'answered_at', a.answered_at
      )
      order by array_position(v_question_order, a.question_id)
    ),
    '[]'::jsonb
  )
  into v_review_items
  from public.practice_answers as a
  join public.questions as q on q.code = a.question_id
  join public.question_solutions as s on s.question_id = a.question_id
  where a.attempt_id = p_attempt_id;

  return pg_catalog.jsonb_build_object(
    'attempt_id', p_attempt_id,
    'unit_slug', v_unit_slug,
    'status', v_attempt_status,
    'total_questions', v_total_questions,
    'answered_count', v_answered_count,
    'correct_count', v_correct_count,
    'started_at', v_started_at,
    'completed_at', v_completed_at,
    'answers', v_review_items
  );
end;
$$;

revoke all on function public.start_or_resume_practice(text) from public;
revoke all on function public.start_or_resume_practice(text) from anon;
grant execute on function public.start_or_resume_practice(text)
  to authenticated;

revoke all on function public.submit_practice_answer(uuid, text, text)
  from public;
revoke all on function public.submit_practice_answer(uuid, text, text)
  from anon;
grant execute on function public.submit_practice_answer(uuid, text, text)
  to authenticated;

revoke all on function public.get_practice_review(uuid) from public;
revoke all on function public.get_practice_review(uuid) from anon;
grant execute on function public.get_practice_review(uuid)
  to authenticated;

comment on table public.learning_units is
  'Published learning content metadata for authenticated learners.';
comment on table public.questions is
  'Published prompts and options only; correct answers are stored separately.';
comment on table public.question_solutions is
  'Private answer key exposed only through owner-checked grading RPCs.';
comment on table public.practice_attempts is
  'Student-owned practice sessions with one stable shuffled question order.';
comment on table public.practice_answers is
  'Immutable graded answers written only by submit_practice_answer().';

commit;
