begin;

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
    'ONE_STEP_WORD_PROBLEM',
    'SUBTRACTION_MEANING',
    'SUBTRACTION_CALCULATION',
    'ADDITION_SUBTRACTION_RELATION',
    'ONE_STEP_SUBTRACTION_WORD_PROBLEM',
    'COUNT_READ_WRITE_TO_20',
    'SEQUENCE_TO_20',
    'COMPARE_ORDER_TO_20',
    'TENS_ONES_TO_20',
    'ADD_TEN_AND_ONES',
    'ADD_TEEN_AND_ONES_NO_CARRY',
    'ADD_USING_TENS_ONES',
    'ONE_STEP_ADDITION_TO_20',
    'SUBTRACTION_WITHIN_20_NO_BORROW',
    'MISSING_NUMBER_SUBTRACTION',
    'SUBTRACTION_WORD_PROBLEM',
    'COUNT_RECOGNIZE_TO_100',
    'READ_WRITE_TO_100',
    'TENS_ONES_COMPOSE',
    'COMPARE_ORDER_TO_100'
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
  'grade-1-numbers-to-100',
  1,
  'Các số trong phạm vi 100',
  'Đếm, đọc, viết, cấu tạo, so sánh và sắp xếp các số từ 0 đến 100.',
  $objectives$[
    "Đếm và nhận biết được các số trong phạm vi 100.",
    "Đọc và viết được các số từ 0 đến 100.",
    "Xác định được số chục và số đơn vị của một số.",
    "Lập được số từ số chục và số đơn vị đã cho.",
    "So sánh, sắp xếp và tìm số liền trước, số liền sau trong phạm vi 100."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "count-to-one-hundred",
        "title": "Đếm các số đến 100",
        "paragraphs": [
          "Ta đếm lần lượt từng số từ 0 đến 100. Sau 29 là 30, sau 39 là 40 và tiếp tục như vậy.",
          "Có thể xếp đồ vật thành từng nhóm 10 để đếm nhanh hơn, rồi đếm thêm các đồ vật còn lẻ."
        ]
      },
      {
        "code": "read-and-write-to-one-hundred",
        "title": "Đọc và viết số",
        "paragraphs": [
          "Số có hai chữ số được đọc từ hàng chục rồi đến hàng đơn vị. Ví dụ, 42 đọc là bốn mươi hai.",
          "Số 100 đọc là một trăm. Trong bài này, các số đều nằm từ 0 đến 100."
        ]
      },
      {
        "code": "tens-and-ones",
        "title": "Chục và đơn vị",
        "paragraphs": [
          "Số 57 gồm 5 chục và 7 đơn vị. Chữ số 5 đứng ở hàng chục, chữ số 7 đứng ở hàng đơn vị.",
          "Một chục có 10 đơn vị. Mười chục tạo thành số 100."
        ]
      },
      {
        "code": "compose-and-decompose",
        "title": "Lập số và phân tích số",
        "paragraphs": [
          "Muốn lập số từ chục và đơn vị, viết số chục trước rồi viết số đơn vị sau. 6 chục và 3 đơn vị tạo thành số 63.",
          "Ngược lại, có thể tách 84 thành 8 chục và 4 đơn vị."
        ]
      },
      {
        "code": "compare-and-order",
        "title": "So sánh và sắp xếp",
        "paragraphs": [
          "Khi so sánh hai số có hai chữ số, so sánh số chục trước. Số có nhiều chục hơn thì lớn hơn.",
          "Nếu số chục bằng nhau, so sánh số đơn vị. Dựa vào đó, ta sắp xếp các số từ bé đến lớn hoặc từ lớn đến bé."
        ]
      },
      {
        "code": "previous-and-next",
        "title": "Số liền trước và số liền sau",
        "paragraphs": [
          "Số liền trước nhỏ hơn số đã cho 1 đơn vị. Số liền sau lớn hơn số đã cho 1 đơn vị.",
          "Ví dụ, số liền trước của 70 là 69 và số liền sau của 70 là 71."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Số 64 gồm mấy chục và mấy đơn vị?",
        "steps": [
          "Nhìn chữ số hàng chục của 64: đó là chữ số 6.",
          "Vậy số 64 có 6 chục.",
          "Nhìn chữ số hàng đơn vị: đó là chữ số 4.",
          "Vậy số 64 có 4 đơn vị."
        ],
        "answer": "Số 64 gồm 6 chục và 4 đơn vị."
      },
      {
        "title": "Sắp xếp 28, 82, 35 từ bé đến lớn",
        "steps": [
          "So sánh hàng chục: 28 có 2 chục, 35 có 3 chục, 82 có 8 chục.",
          "Hai chục ít hơn ba chục nên 28 nhỏ hơn 35.",
          "Ba chục ít hơn tám chục nên 35 nhỏ hơn 82.",
          "Viết các số theo thứ tự đã tìm được."
        ],
        "answer": "Thứ tự từ bé đến lớn là 28, 35, 82."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  7,
  'grade-1-subtraction-within-20-no-borrow'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-num100-q01","question_type":"MULTIPLE_CHOICE","prompt":"Có 4 nhóm, mỗi nhóm 10 chấm tròn, và thêm 3 chấm tròn. Có tất cả bao nhiêu chấm tròn?","options":{"A":"34","B":"40","C":"43","D":"44"},"skill_code":"COUNT_RECOGNIZE_TO_100","difficulty":"EASY","display_order":1},
      {"code":"g1-num100-q02","question_type":"MULTIPLE_CHOICE","prompt":"Dãy số 36, 37, 38 tiếp tục bằng số nào?","options":{"A":"35","B":"39","C":"40","D":"48"},"skill_code":"COUNT_RECOGNIZE_TO_100","difficulty":"EASY","display_order":2},
      {"code":"g1-num100-q03","question_type":"MULTIPLE_CHOICE","prompt":"Đếm thêm một chục từ số 20, em đến số nào?","options":{"A":"21","B":"29","C":"30","D":"40"},"skill_code":"COUNT_RECOGNIZE_TO_100","difficulty":"MEDIUM","display_order":3},
      {"code":"g1-num100-q04","question_type":"MULTIPLE_CHOICE","prompt":"Số nào nằm ngay giữa 68 và 70?","options":{"A":"67","B":"69","C":"71","D":"78"},"skill_code":"COUNT_RECOGNIZE_TO_100","difficulty":"EASY","display_order":4},
      {"code":"g1-num100-q05","question_type":"NUMBER_INPUT","prompt":"Đếm tiếp rồi nhập số còn thiếu: 74, 75, 76, ___.","options":null,"skill_code":"COUNT_RECOGNIZE_TO_100","difficulty":"EASY","display_order":5},
      {"code":"g1-num100-q06","question_type":"NUMBER_INPUT","prompt":"Chín chục và bốn đơn vị biểu diễn số nào?","options":null,"skill_code":"COUNT_RECOGNIZE_TO_100","difficulty":"MEDIUM","display_order":6},

      {"code":"g1-num100-q07","question_type":"MULTIPLE_CHOICE","prompt":"Số 45 được đọc như thế nào?","options":{"A":"Bốn mươi lăm","B":"Bốn mươi bốn","C":"Năm mươi bốn","D":"Bốn mươi"},"skill_code":"READ_WRITE_TO_100","difficulty":"EASY","display_order":7},
      {"code":"g1-num100-q08","question_type":"MULTIPLE_CHOICE","prompt":"Số “bảy mươi hai” được viết bằng chữ số nào?","options":{"A":"27","B":"70","C":"72","D":"82"},"skill_code":"READ_WRITE_TO_100","difficulty":"EASY","display_order":8},
      {"code":"g1-num100-q09","question_type":"MULTIPLE_CHOICE","prompt":"Cách đọc đúng của số 80 là gì?","options":{"A":"Tám mươi","B":"Tám mươi tám","C":"Tám chục tám","D":"Mười tám"},"skill_code":"READ_WRITE_TO_100","difficulty":"EASY","display_order":9},
      {"code":"g1-num100-q10","question_type":"MULTIPLE_CHOICE","prompt":"Số nào được đọc là “chín mươi chín”?","options":{"A":"90","B":"91","C":"98","D":"99"},"skill_code":"READ_WRITE_TO_100","difficulty":"MEDIUM","display_order":10},
      {"code":"g1-num100-q11","question_type":"NUMBER_INPUT","prompt":"Viết bằng chữ số: sáu mươi ba.","options":null,"skill_code":"READ_WRITE_TO_100","difficulty":"EASY","display_order":11},
      {"code":"g1-num100-q12","question_type":"NUMBER_INPUT","prompt":"Viết bằng chữ số: một trăm.","options":null,"skill_code":"READ_WRITE_TO_100","difficulty":"MEDIUM","display_order":12},

      {"code":"g1-num100-q13","question_type":"MULTIPLE_CHOICE","prompt":"Số 57 gồm mấy chục và mấy đơn vị?","options":{"A":"5 chục và 7 đơn vị","B":"7 chục và 5 đơn vị","C":"5 chục và 5 đơn vị","D":"7 chục và 0 đơn vị"},"skill_code":"TENS_ONES_COMPOSE","difficulty":"EASY","display_order":13},
      {"code":"g1-num100-q14","question_type":"MULTIPLE_CHOICE","prompt":"Tám chục và hai đơn vị tạo thành số nào?","options":{"A":"28","B":"80","C":"82","D":"88"},"skill_code":"TENS_ONES_COMPOSE","difficulty":"EASY","display_order":14},
      {"code":"g1-num100-q15","question_type":"MULTIPLE_CHOICE","prompt":"Số có 6 chục và 0 đơn vị là số nào?","options":{"A":"6","B":"16","C":"60","D":"66"},"skill_code":"TENS_ONES_COMPOSE","difficulty":"EASY","display_order":15},
      {"code":"g1-num100-q16","question_type":"MULTIPLE_CHOICE","prompt":"Số 100 gồm bao nhiêu chục?","options":{"A":"1 chục","B":"9 chục","C":"10 chục","D":"100 chục"},"skill_code":"TENS_ONES_COMPOSE","difficulty":"MEDIUM","display_order":16},
      {"code":"g1-num100-q17","question_type":"NUMBER_INPUT","prompt":"Bốn chục và chín đơn vị tạo thành số nào?","options":null,"skill_code":"TENS_ONES_COMPOSE","difficulty":"EASY","display_order":17},
      {"code":"g1-num100-q18","question_type":"NUMBER_INPUT","prompt":"Số 76 có bao nhiêu đơn vị?","options":null,"skill_code":"TENS_ONES_COMPOSE","difficulty":"MEDIUM","display_order":18},

      {"code":"g1-num100-q19","question_type":"MULTIPLE_CHOICE","prompt":"Dấu nào thích hợp khi so sánh 58 và 61?","options":{"A":">","B":"<","C":"=","D":"Không so sánh được"},"skill_code":"COMPARE_ORDER_TO_100","difficulty":"EASY","display_order":19},
      {"code":"g1-num100-q20","question_type":"MULTIPLE_CHOICE","prompt":"Trong các số 47, 74, 64, 70, số nào lớn nhất?","options":{"A":"47","B":"64","C":"70","D":"74"},"skill_code":"COMPARE_ORDER_TO_100","difficulty":"EASY","display_order":20},
      {"code":"g1-num100-q21","question_type":"MULTIPLE_CHOICE","prompt":"Dãy nào sắp xếp 32, 23, 30 theo thứ tự từ bé đến lớn?","options":{"A":"23, 30, 32","B":"23, 32, 30","C":"30, 23, 32","D":"32, 30, 23"},"skill_code":"COMPARE_ORDER_TO_100","difficulty":"MEDIUM","display_order":21},
      {"code":"g1-num100-q22","question_type":"MULTIPLE_CHOICE","prompt":"Số liền trước của 90 là số nào?","options":{"A":"80","B":"89","C":"91","D":"99"},"skill_code":"COMPARE_ORDER_TO_100","difficulty":"EASY","display_order":22},
      {"code":"g1-num100-q23","question_type":"NUMBER_INPUT","prompt":"Nhập số liền sau của 99.","options":null,"skill_code":"COMPARE_ORDER_TO_100","difficulty":"MEDIUM","display_order":23},
      {"code":"g1-num100-q24","question_type":"NUMBER_INPUT","prompt":"Trong các số 81, 18, 71, số nào nhỏ nhất?","options":null,"skill_code":"COMPARE_ORDER_TO_100","difficulty":"MEDIUM","display_order":24}
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
  'grade-1-numbers-to-100',
  seed.question_type,
  seed.prompt,
  seed.options,
  seed.skill_code,
  seed.difficulty,
  seed.display_order,
  true
from question_seed as seed
on conflict (code) do nothing;

with solution_seed as (
  select *
  from jsonb_to_recordset(
    $solutions$[
      {"question_id":"g1-num100-q01","correct_answer":"C","solution_steps":["Bốn nhóm 10 chấm tạo thành 4 chục, tức 40 chấm.","Đếm thêm 3 chấm rời: 40, 41, 42, 43."],"explanation":"Bốn chục và ba đơn vị tạo thành số 43.","hint":"Đếm các nhóm chục trước rồi đếm phần còn lẻ."},
      {"question_id":"g1-num100-q02","correct_answer":"B","solution_steps":["Các số đang tăng dần từng 1 đơn vị: 36, 37, 38.","Số lớn hơn 38 một đơn vị là 39."],"explanation":"Sau số 38 là số 39.","hint":"Đếm tiếp một số sau ba mươi tám."},
      {"question_id":"g1-num100-q03","correct_answer":"C","solution_steps":["Số 20 gồm 2 chục.","Thêm một chục nữa được 3 chục, tức số 30."],"explanation":"Hai chục thêm một chục tạo thành ba chục.","hint":"Đếm theo chục: hai chục rồi ba chục."},
      {"question_id":"g1-num100-q04","correct_answer":"B","solution_steps":["Đếm tiếp từ 68 được 69 rồi 70.","Vì 69 đứng sau 68 và trước 70 nên 69 nằm giữa hai số."],"explanation":"Số nằm ngay giữa 68 và 70 là 69.","hint":"Đếm lần lượt ba số bắt đầu từ sáu mươi tám."},
      {"question_id":"g1-num100-q05","correct_answer":"77","solution_steps":["Dãy số tăng thêm 1: 74, 75, 76.","Số liền sau của 76 là 77."],"explanation":"Số cần điền là 77.","hint":"Đếm thêm một sau bảy mươi sáu."},
      {"question_id":"g1-num100-q06","correct_answer":"94","solution_steps":["Chín chục được viết bằng chữ số 9 ở hàng chục.","Bốn đơn vị được viết bằng chữ số 4 ở hàng đơn vị, tạo thành 94."],"explanation":"Chín chục và bốn đơn vị là số 94.","hint":"Viết số chục trước rồi viết số đơn vị."},

      {"question_id":"g1-num100-q07","correct_answer":"A","solution_steps":["Chữ số 4 ở hàng chục nên đọc là bốn mươi.","Chữ số 5 ở hàng đơn vị nên đọc tiếp là lăm: bốn mươi lăm."],"explanation":"Số 45 đọc là bốn mươi lăm.","hint":"Đọc hàng chục trước rồi đọc hàng đơn vị."},
      {"question_id":"g1-num100-q08","correct_answer":"C","solution_steps":["“Bảy mươi” cho biết có 7 chục.","“Hai” cho biết có 2 đơn vị, nên viết số 72."],"explanation":"Bảy mươi hai được viết là 72.","hint":"Viết chữ số bảy trước rồi chữ số hai."},
      {"question_id":"g1-num100-q09","correct_answer":"A","solution_steps":["Chữ số 8 ở hàng chục cho biết có tám chục.","Chữ số 0 ở hàng đơn vị nên số 80 đọc là tám mươi."],"explanation":"Cách đọc đúng là tám mươi.","hint":"Số này có tám chục và không có đơn vị lẻ."},
      {"question_id":"g1-num100-q10","correct_answer":"D","solution_steps":["“Chín mươi” cho biết chữ số hàng chục là 9.","“Chín” tiếp theo cho biết chữ số hàng đơn vị cũng là 9, nên được số 99."],"explanation":"Chín mươi chín được viết là 99.","hint":"Cả hàng chục và hàng đơn vị đều là chín."},
      {"question_id":"g1-num100-q11","correct_answer":"63","solution_steps":["“Sáu mươi” cho biết có 6 chục.","“Ba” cho biết có 3 đơn vị, nên viết số 63."],"explanation":"Sáu mươi ba được viết bằng chữ số là 63.","hint":"Viết sáu ở hàng chục và ba ở hàng đơn vị."},
      {"question_id":"g1-num100-q12","correct_answer":"100","solution_steps":["Một trăm gồm 10 chục.","Số một trăm được viết bằng ba chữ số 1, 0, 0."],"explanation":"Một trăm được viết là 100.","hint":"Đây là số đứng ngay sau chín mươi chín."},

      {"question_id":"g1-num100-q13","correct_answer":"A","solution_steps":["Trong số 57, chữ số 5 đứng ở hàng chục.","Chữ số 7 đứng ở hàng đơn vị, nên số 57 gồm 5 chục và 7 đơn vị."],"explanation":"Năm chục và bảy đơn vị tạo thành số 57.","hint":"Nhìn chữ số bên trái rồi đến chữ số bên phải."},
      {"question_id":"g1-num100-q14","correct_answer":"C","solution_steps":["Tám chục cho biết chữ số hàng chục là 8.","Hai đơn vị cho biết chữ số hàng đơn vị là 2, nên được số 82."],"explanation":"Tám chục và hai đơn vị tạo thành số 82.","hint":"Viết tám trước rồi viết hai."},
      {"question_id":"g1-num100-q15","correct_answer":"C","solution_steps":["Sáu chục được viết bằng chữ số 6 ở hàng chục.","Không có đơn vị lẻ nên hàng đơn vị là 0, tạo thành số 60."],"explanation":"Sáu chục và không đơn vị là số 60.","hint":"Số tròn chục có chữ số 0 ở hàng đơn vị."},
      {"question_id":"g1-num100-q16","correct_answer":"C","solution_steps":["Mỗi chục có 10 đơn vị.","Mười nhóm chục tạo thành 100, nên số 100 gồm 10 chục."],"explanation":"Số 100 tương ứng với mười chục.","hint":"Đếm các chục: 10, 20, 30 cho đến 100."},
      {"question_id":"g1-num100-q17","correct_answer":"49","solution_steps":["Bốn chục cho biết chữ số hàng chục là 4.","Chín đơn vị cho biết chữ số hàng đơn vị là 9, nên được số 49."],"explanation":"Bốn chục và chín đơn vị tạo thành số 49.","hint":"Viết số chục trước, số đơn vị sau."},
      {"question_id":"g1-num100-q18","correct_answer":"6","solution_steps":["Trong số 76, chữ số bên phải là chữ số hàng đơn vị.","Chữ số đó là 6, nên số 76 có 6 đơn vị."],"explanation":"Số đơn vị của 76 là 6.","hint":"Nhìn chữ số cuối cùng của số bảy mươi sáu."},

      {"question_id":"g1-num100-q19","correct_answer":"B","solution_steps":["Số 58 có 5 chục, còn số 61 có 6 chục.","Năm chục ít hơn sáu chục nên 58 nhỏ hơn 61."],"explanation":"Dấu thích hợp là dấu bé hơn: 58 < 61.","hint":"So sánh chữ số hàng chục trước."},
      {"question_id":"g1-num100-q20","correct_answer":"D","solution_steps":["So sánh hàng chục của 47, 74, 64 và 70: lần lượt là 4, 7, 6 và 7.","Hai số có 7 chục là 74 và 70; so sánh đơn vị, 4 lớn hơn 0 nên 74 lớn nhất."],"explanation":"Số lớn nhất trong bốn số là 74.","hint":"Tìm số có nhiều chục nhất rồi so sánh đơn vị."},
      {"question_id":"g1-num100-q21","correct_answer":"A","solution_steps":["Số 23 có 2 chục nên nhỏ hơn các số có 3 chục.","Giữa 30 và 32, cùng có 3 chục nhưng 0 đơn vị ít hơn 2 đơn vị, nên thứ tự là 23, 30, 32."],"explanation":"Dãy từ bé đến lớn là 23, 30, 32.","hint":"So sánh hàng chục trước, rồi so sánh hàng đơn vị."},
      {"question_id":"g1-num100-q22","correct_answer":"B","solution_steps":["Số liền trước nhỏ hơn số đã cho 1 đơn vị.","Đếm lùi một số từ 90 được 89."],"explanation":"Số liền trước của 90 là 89.","hint":"Đếm lùi một bước từ chín mươi."},
      {"question_id":"g1-num100-q23","correct_answer":"100","solution_steps":["Số liền sau lớn hơn số đã cho 1 đơn vị.","Đếm tiếp một số sau 99 được 100."],"explanation":"Số liền sau của 99 là 100.","hint":"Đếm tiếp sau chín mươi chín."},
      {"question_id":"g1-num100-q24","correct_answer":"18","solution_steps":["So sánh hàng chục: 81 có 8 chục, 18 có 1 chục, 71 có 7 chục.","Một chục ít hơn bảy chục và tám chục, nên 18 là số nhỏ nhất."],"explanation":"Số nhỏ nhất trong ba số là 18.","hint":"Số có ít chục nhất sẽ nhỏ nhất."}
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
from solution_seed as seed
on conflict (question_id) do nothing;

-- The shared input transport accepts the largest current curriculum value.
-- Per-unit correctness still comes only from the protected solution row.
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
  from public.profiles as profile
  join public.student_profiles as student
    on student.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_attempt_id::text, 1)
  );

  select
    attempt.status,
    attempt.unit_slug,
    attempt.question_order,
    attempt.answered_count,
    attempt.correct_count
  into
    v_attempt_status,
    v_unit_slug,
    v_question_order,
    v_answered_count,
    v_correct_count
  from public.practice_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_attempt_status is null then
    raise exception 'Practice unavailable';
  end if;

  select count(*)
  into v_existing_answer_count
  from public.practice_answers as answer
  where answer.attempt_id = p_attempt_id
    and answer.question_id = p_question_id;

  if v_existing_answer_count = 1 then
    select
      answer.is_correct,
      solution.correct_answer,
      solution.solution_steps,
      solution.explanation,
      solution.hint
    into
      v_is_correct,
      v_correct_answer,
      v_solution_steps,
      v_explanation,
      v_hint
    from public.practice_answers as answer
    join public.question_solutions as solution
      on solution.question_id = answer.question_id
    where answer.attempt_id = p_attempt_id
      and answer.question_id = p_question_id;

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
    question.question_type,
    solution.correct_answer,
    solution.solution_steps,
    solution.explanation,
    solution.hint
  into
    v_question_type,
    v_correct_answer,
    v_solution_steps,
    v_explanation,
    v_hint
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.code = p_question_id
    and question.unit_slug = v_unit_slug
    and question.published;

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
      v_normalized_answer !~ '^(0|[1-9][0-9]?|100)$'
      or v_normalized_answer::integer not between 0 and 100
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
    count(*) filter (where answer.is_correct)
  into
    v_answered_count,
    v_correct_count
  from public.practice_answers as answer
  where answer.attempt_id = p_attempt_id;

  v_completed := v_answered_count = 24;

  update public.practice_attempts as attempt
  set
    answered_count = v_answered_count::smallint,
    correct_count = v_correct_count::smallint,
    status = case
      when v_completed then 'COMPLETED'
      else 'IN_PROGRESS'
    end,
    completed_at = case
      when v_completed then now()
      else null
    end
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

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

revoke all on function public.submit_practice_answer(uuid, text, text)
  from public;
revoke all on function public.submit_practice_answer(uuid, text, text)
  from anon;
grant execute on function public.submit_practice_answer(uuid, text, text)
  to authenticated;

do $validation$
declare
  v_unit_count integer := 0;
  v_question_count integer := 0;
  v_solution_count integer := 0;
  v_mcq_count integer := 0;
  v_number_count integer := 0;
  v_duplicate_code_count integer := 0;
  v_duplicate_prompt_count integer := 0;
  v_invalid_skill_count integer := 0;
  v_invalid_mcq_count integer := 0;
  v_invalid_number_count integer := 0;
  v_invalid_solution_count integer := 0;
  v_out_of_range_count integer := 0;
  v_start_definition text;
  v_submit_definition text;
  v_review_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-1-numbers-to-100'
    and unit.grade = 1
    and unit.title = 'Các số trong phạm vi 100'
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 7
    and unit.prerequisite_unit_slug =
      'grade-1-subtraction-within-20-no-borrow'
    and pg_catalog.jsonb_array_length(unit.learning_objectives) >= 4
    and pg_catalog.jsonb_array_length(
      unit.lesson_content -> 'sections'
    ) = 6
    and pg_catalog.jsonb_array_length(
      unit.lesson_content -> 'worked_examples'
    ) >= 2;

  select
    count(*),
    count(*) filter (where question.question_type = 'MULTIPLE_CHOICE'),
    count(*) filter (where question.question_type = 'NUMBER_INPUT')
  into
    v_question_count,
    v_mcq_count,
    v_number_count
  from public.questions as question
  where
    question.unit_slug = 'grade-1-numbers-to-100'
    and question.published;

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-numbers-to-100';

  select count(*)
  into v_invalid_skill_count
  from (
    select
      question.skill_code,
      count(*) as question_count
    from public.questions as question
    where question.unit_slug = 'grade-1-numbers-to-100'
    group by question.skill_code
  ) as skill_totals
  where
    skill_totals.skill_code not in (
      'COUNT_RECOGNIZE_TO_100',
      'READ_WRITE_TO_100',
      'TENS_ONES_COMPOSE',
      'COMPARE_ORDER_TO_100'
    )
    or skill_totals.question_count <> 6;

  if (
    select count(distinct question.skill_code)
    from public.questions as question
    where question.unit_slug = 'grade-1-numbers-to-100'
  ) <> 4 then
    v_invalid_skill_count := v_invalid_skill_count + 1;
  end if;

  select count(*)
  into v_duplicate_code_count
  from (
    select question.code
    from public.questions as question
    where question.unit_slug = 'grade-1-numbers-to-100'
    group by question.code
    having count(*) > 1
  ) as duplicate_codes;

  select count(*)
  into v_duplicate_prompt_count
  from (
    select lower(btrim(question.prompt))
    from public.questions as question
    where question.unit_slug = 'grade-1-numbers-to-100'
    group by lower(btrim(question.prompt))
    having count(*) > 1
  ) as duplicate_prompts;

  select count(*)
  into v_invalid_mcq_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-numbers-to-100'
    and question.question_type = 'MULTIPLE_CHOICE'
    and (
      question.options is null
      or pg_catalog.jsonb_typeof(question.options) <> 'object'
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(question.options)
      ) <> 4
      or not (question.options ?& array['A', 'B', 'C', 'D'])
      or exists (
        select 1
        from pg_catalog.jsonb_each_text(question.options) as option_item
        where btrim(option_item.value) = ''
      )
      or solution.correct_answer !~ '^[A-D]$'
      or not (question.options ? solution.correct_answer)
    );

  select count(*)
  into v_invalid_number_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-numbers-to-100'
    and question.question_type = 'NUMBER_INPUT'
    and (
      question.options is not null
      or solution.correct_answer !~ '^(0|[1-9][0-9]?|100)$'
      or solution.correct_answer::integer not between 0 and 100
    );

  select count(*)
  into v_invalid_solution_count
  from public.questions as question
  left join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-numbers-to-100'
    and (
      solution.question_id is null
      or solution.correct_answer is null
      or pg_catalog.jsonb_typeof(solution.solution_steps) <> 'array'
      or pg_catalog.jsonb_array_length(solution.solution_steps) < 2
      or btrim(solution.explanation) = ''
      or btrim(solution.hint) = ''
    );

  select count(*)
  into v_out_of_range_count
  from public.questions as question
  cross join lateral pg_catalog.regexp_matches(
    question.prompt || ' ' || coalesce(question.options::text, ''),
    '(^|[^0-9])([0-9]{1,3})([^0-9]|$)',
    'g'
  ) as number_match
  where
    question.unit_slug = 'grade-1-numbers-to-100'
    and number_match[2]::integer > 100;

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_invalid_skill_count <> 0
    or v_duplicate_code_count <> 0
    or v_duplicate_prompt_count <> 0
    or v_invalid_mcq_count <> 0
    or v_invalid_number_count <> 0
    or v_invalid_solution_count <> 0
    or v_out_of_range_count <> 0
  then
    raise exception 'Grade 1 numbers-to-100 content validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as previous_unit
    join public.learning_units as current_unit
      on current_unit.prerequisite_unit_slug = previous_unit.slug
    where
      previous_unit.slug = 'grade-1-subtraction-within-20-no-borrow'
      and previous_unit.display_order = 6
      and current_unit.slug = 'grade-1-numbers-to-100'
      and current_unit.display_order = 7
  ) then
    raise exception 'Grade 1 numbers-to-100 prerequisite validation failed';
  end if;

  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_start_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname = 'start_or_resume_practice'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_unit_slug text';

  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_submit_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname = 'submit_practice_answer'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_attempt_id uuid, p_question_id text, p_answer text';

  select pg_catalog.pg_get_functiondef(procedure.oid)
  into v_review_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname = 'get_practice_review'
    and pg_catalog.pg_get_function_identity_arguments(procedure.oid)
      = 'p_attempt_id uuid';

  if
    v_start_definition is null
    or v_start_definition !~ 'prerequisite_unit_slug'
    or v_start_definition !~ 'prerequisite_attempt.status = ''COMPLETED'''
    or v_start_definition !~ 'profile.user_id = v_current_user_id'
    or v_start_definition !~ 'profile.role = ''STUDENT'''
    or v_start_definition !~ 'profile.onboarding_completed'
    or v_start_definition !~ 'attempt.student_id = v_current_user_id'
    or v_submit_definition is null
    or v_submit_definition !~ 'not between 0 and 100'
    or v_submit_definition !~ 'attempt.student_id = v_current_user_id'
    or v_review_definition is null
    or v_review_definition !~ 'pa.student_id = v_current_user_id'
  then
    raise exception 'Practice RPC authorization validation failed';
  end if;

  if
    not pg_catalog.has_function_privilege(
      'authenticated',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.submit_practice_answer(uuid,text,text)',
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.get_practice_review(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.submit_practice_answer(uuid,text,text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.get_practice_review(uuid)',
      'EXECUTE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
  then
    raise exception 'Practice grants validation failed';
  end if;
end;
$validation$;

commit;
