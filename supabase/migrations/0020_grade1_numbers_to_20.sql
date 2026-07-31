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
    'TENS_ONES_TO_20'
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
  'grade-1-numbers-to-20',
  1,
  'Các số trong phạm vi 20',
  'Đếm, đọc, viết, so sánh và nhận biết chục, đơn vị của các số đến 20.',
  $objectives$[
    "Đếm đúng số lượng từ 0 đến 20.",
    "Đọc và viết được các số trong phạm vi 20.",
    "Xác định được số liền trước và số liền sau.",
    "So sánh và sắp xếp được các số từ 0 đến 20.",
    "Nhận biết chục và đơn vị của các số từ 10 đến 20."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "count-to-20",
        "title": "Đếm từ 0 đến 20",
        "paragraphs": [
          "Khi đếm tăng, mỗi số đứng sau lớn hơn số trước một đơn vị. Ta có thể đếm 10, 11, 12 rồi tiếp tục đến 20.",
          "Khi đếm lùi, mỗi lần ta bớt một đơn vị. Ví dụ: 16, 15, 14, 13."
        ]
      },
      {
        "code": "read-write-to-20",
        "title": "Đọc và viết các số",
        "paragraphs": [
          "Các số 11, 12, 13 được đọc là mười một, mười hai, mười ba. Ta đọc tương tự đến mười chín.",
          "Số 20 được đọc là hai mươi. Khi nghe cách đọc, em viết đúng chữ số tương ứng."
        ]
      },
      {
        "code": "previous-next-to-20",
        "title": "Số liền trước và số liền sau",
        "paragraphs": [
          "Số liền trước đứng ngay bên trái trên dãy số. Số liền trước của 15 là 14.",
          "Số liền sau đứng ngay bên phải trên dãy số. Số liền sau của 18 là 19."
        ]
      },
      {
        "code": "compare-to-20",
        "title": "So sánh các số",
        "paragraphs": [
          "Số nằm xa hơn về bên phải trên dãy số thì lớn hơn. Vì 17 đứng sau 13 nên 17 > 13.",
          "Ta dùng dấu > cho lớn hơn, dấu < cho bé hơn và dấu = cho bằng nhau."
        ]
      },
      {
        "code": "order-to-20",
        "title": "Sắp xếp các số",
        "paragraphs": [
          "Muốn xếp từ bé đến lớn, ta chọn số nhỏ nhất trước rồi tiếp tục đến số lớn nhất.",
          "Muốn xếp từ lớn đến bé, ta làm ngược lại. Ví dụ: 18, 15, 12."
        ]
      },
      {
        "code": "tens-and-ones-to-20",
        "title": "Chục và đơn vị",
        "paragraphs": [
          "Số 10 gồm 1 chục và 0 đơn vị. Các số từ 11 đến 19 gồm 1 chục và một số đơn vị.",
          "Số 20 gồm 2 chục và 0 đơn vị. Ví dụ: 17 gồm 1 chục và 7 đơn vị."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Số 17 gồm mấy chục và mấy đơn vị?",
        "steps": [
          "Nhận ra 17 lớn hơn 10 nên số này có một chục đầy đủ.",
          "Tách 17 thành 1 chục và 7 đơn vị.",
          "Kết luận cấu tạo của số 17."
        ],
        "answer": "Số 17 gồm 1 chục và 7 đơn vị."
      },
      {
        "title": "Sắp xếp 12, 18, 15 từ bé đến lớn",
        "steps": [
          "Đặt ba số 12, 18, 15 lên dãy số để so sánh.",
          "Số 12 đứng trước nên là số nhỏ nhất.",
          "Số 18 đứng sau cùng nên là số lớn nhất.",
          "Viết số còn lại là 15 vào giữa."
        ],
        "answer": "Thứ tự từ bé đến lớn là 12, 15, 18."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  4,
  'grade-1-subtraction-within-10'
);

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-n20-q01","question_type":"MULTIPLE_CHOICE","prompt":"Đếm các chấm: ● ● ● ● ● ● ● ● ● ● ● ● ●. Có bao nhiêu chấm?","options":{"A":"12","B":"13","C":"14","D":"20"},"skill_code":"COUNT_READ_WRITE_TO_20","difficulty":"EASY","display_order":1},
      {"code":"g1-n20-q02","question_type":"MULTIPLE_CHOICE","prompt":"Cách đọc “mười sáu” được viết bằng số nào?","options":{"A":"6","B":"15","C":"16","D":"20"},"skill_code":"COUNT_READ_WRITE_TO_20","difficulty":"EASY","display_order":2},
      {"code":"g1-n20-q03","question_type":"MULTIPLE_CHOICE","prompt":"Số 19 được đọc như thế nào?","options":{"A":"Mười chín","B":"Mười tám","C":"Chín mươi","D":"Hai mươi"},"skill_code":"COUNT_READ_WRITE_TO_20","difficulty":"EASY","display_order":3},
      {"code":"g1-n20-q04","question_type":"MULTIPLE_CHOICE","prompt":"Một bó có 10 que tính và bên cạnh có 4 que rời. Tất cả biểu diễn số nào?","options":{"A":"10","B":"12","C":"14","D":"18"},"skill_code":"COUNT_READ_WRITE_TO_20","difficulty":"MEDIUM","display_order":4},
      {"code":"g1-n20-q05","question_type":"NUMBER_INPUT","prompt":"Em hãy viết bằng chữ số: mười hai.","options":null,"skill_code":"COUNT_READ_WRITE_TO_20","difficulty":"EASY","display_order":5},
      {"code":"g1-n20-q06","question_type":"NUMBER_INPUT","prompt":"Một bó có 10 que tính và 8 que rời. Các que tính biểu diễn số nào?","options":null,"skill_code":"COUNT_READ_WRITE_TO_20","difficulty":"MEDIUM","display_order":6},

      {"code":"g1-n20-q07","question_type":"MULTIPLE_CHOICE","prompt":"Số liền trước của 15 là số nào?","options":{"A":"13","B":"14","C":"16","D":"20"},"skill_code":"SEQUENCE_TO_20","difficulty":"EASY","display_order":7},
      {"code":"g1-n20-q08","question_type":"MULTIPLE_CHOICE","prompt":"Số liền sau của 18 là số nào?","options":{"A":"17","B":"18","C":"19","D":"20"},"skill_code":"SEQUENCE_TO_20","difficulty":"EASY","display_order":8},
      {"code":"g1-n20-q09","question_type":"MULTIPLE_CHOICE","prompt":"Số nào còn thiếu trong dãy 12, 13, ..., 15?","options":{"A":"11","B":"14","C":"16","D":"20"},"skill_code":"SEQUENCE_TO_20","difficulty":"EASY","display_order":9},
      {"code":"g1-n20-q10","question_type":"MULTIPLE_CHOICE","prompt":"Số nào tiếp theo trong dãy đếm lùi 20, 19, 18, ...?","options":{"A":"16","B":"17","C":"19","D":"20"},"skill_code":"SEQUENCE_TO_20","difficulty":"MEDIUM","display_order":10},
      {"code":"g1-n20-q11","question_type":"NUMBER_INPUT","prompt":"Nhập số liền sau của 16.","options":null,"skill_code":"SEQUENCE_TO_20","difficulty":"EASY","display_order":11},
      {"code":"g1-n20-q12","question_type":"NUMBER_INPUT","prompt":"Nhập số liền trước của 20.","options":null,"skill_code":"SEQUENCE_TO_20","difficulty":"EASY","display_order":12},

      {"code":"g1-n20-q13","question_type":"MULTIPLE_CHOICE","prompt":"Dấu nào thích hợp để điền vào 17 ... 14?","options":{"A":">","B":"<","C":"=","D":"Không so sánh được"},"skill_code":"COMPARE_ORDER_TO_20","difficulty":"EASY","display_order":13},
      {"code":"g1-n20-q14","question_type":"MULTIPLE_CHOICE","prompt":"Dấu nào thích hợp để điền vào 12 ... 12?","options":{"A":">","B":"<","C":"=","D":"Không so sánh được"},"skill_code":"COMPARE_ORDER_TO_20","difficulty":"EASY","display_order":14},
      {"code":"g1-n20-q15","question_type":"MULTIPLE_CHOICE","prompt":"Trong các số 11, 18, 15, 13, số nào lớn nhất?","options":{"A":"11","B":"13","C":"15","D":"18"},"skill_code":"COMPARE_ORDER_TO_20","difficulty":"EASY","display_order":15},
      {"code":"g1-n20-q16","question_type":"MULTIPLE_CHOICE","prompt":"Cách sắp xếp 14, 11, 17 từ bé đến lớn nào đúng?","options":{"A":"11, 14, 17","B":"17, 14, 11","C":"14, 11, 17","D":"11, 17, 14"},"skill_code":"COMPARE_ORDER_TO_20","difficulty":"MEDIUM","display_order":16},
      {"code":"g1-n20-q17","question_type":"NUMBER_INPUT","prompt":"Trong các số 20, 16, 19, số nào nhỏ nhất?","options":null,"skill_code":"COMPARE_ORDER_TO_20","difficulty":"EASY","display_order":17},
      {"code":"g1-n20-q18","question_type":"NUMBER_INPUT","prompt":"Trong các số 12, 15, 9, số nào lớn nhất?","options":null,"skill_code":"COMPARE_ORDER_TO_20","difficulty":"EASY","display_order":18},

      {"code":"g1-n20-q19","question_type":"MULTIPLE_CHOICE","prompt":"Số 17 gồm mấy chục và mấy đơn vị?","options":{"A":"1 chục và 7 đơn vị","B":"1 chục và 6 đơn vị","C":"1 chục và 8 đơn vị","D":"2 chục và 0 đơn vị"},"skill_code":"TENS_ONES_TO_20","difficulty":"EASY","display_order":19},
      {"code":"g1-n20-q20","question_type":"MULTIPLE_CHOICE","prompt":"Số nào gồm 1 chục và 3 đơn vị?","options":{"A":"3","B":"10","C":"13","D":"20"},"skill_code":"TENS_ONES_TO_20","difficulty":"EASY","display_order":20},
      {"code":"g1-n20-q21","question_type":"MULTIPLE_CHOICE","prompt":"Số 20 có cấu tạo nào đúng?","options":{"A":"1 chục và 2 đơn vị","B":"2 chục và 0 đơn vị","C":"1 chục và 9 đơn vị","D":"1 chục và 0 đơn vị"},"skill_code":"TENS_ONES_TO_20","difficulty":"EASY","display_order":21},
      {"code":"g1-n20-q22","question_type":"MULTIPLE_CHOICE","prompt":"Số 10 gồm mấy chục và mấy đơn vị?","options":{"A":"0 chục và 1 đơn vị","B":"1 chục và 0 đơn vị","C":"1 chục và 1 đơn vị","D":"2 chục và 0 đơn vị"},"skill_code":"TENS_ONES_TO_20","difficulty":"MEDIUM","display_order":22},
      {"code":"g1-n20-q23","question_type":"NUMBER_INPUT","prompt":"Một số gồm 1 chục và 9 đơn vị. Đó là số nào?","options":null,"skill_code":"TENS_ONES_TO_20","difficulty":"EASY","display_order":23},
      {"code":"g1-n20-q24","question_type":"NUMBER_INPUT","prompt":"Số 14 có bao nhiêu đơn vị?","options":null,"skill_code":"TENS_ONES_TO_20","difficulty":"EASY","display_order":24}
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
  'grade-1-numbers-to-20',
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
      {"question_id":"g1-n20-q01","correct_answer":"B","solution_steps":["Đếm lần lượt từng chấm tròn trong nhóm.","Nhóm có 13 chấm nên chọn chữ số 13."],"explanation":"Chữ số 13 biểu diễn đúng số lượng mười ba chấm tròn.","hint":"Em hãy chỉ vào từng chấm và đếm chậm từ 1."},
      {"question_id":"g1-n20-q02","correct_answer":"C","solution_steps":["Nghe cách đọc gồm từ mười và sáu.","Cách đọc mười sáu được viết bằng chữ số 16."],"explanation":"Chữ số 16 được đọc là mười sáu.","hint":"Tìm chữ số có hàng chục là 1 và hàng đơn vị là 6."},
      {"question_id":"g1-n20-q03","correct_answer":"A","solution_steps":["Nhìn số 19 gồm chữ số 1 ở hàng chục và 9 ở hàng đơn vị.","Số này được đọc là mười chín."],"explanation":"Số 19 có cách đọc đúng là mười chín.","hint":"Đọc phần một chục trước rồi đọc chín đơn vị."},
      {"question_id":"g1-n20-q04","correct_answer":"C","solution_steps":["Một bó que tính biểu diễn 10 que.","Ghép thêm 4 que rời được số 14."],"explanation":"Một chục và bốn đơn vị tạo thành số 14.","hint":"Bắt đầu từ 10 rồi đếm thêm bốn que rời."},
      {"question_id":"g1-n20-q05","correct_answer":"12","solution_steps":["Cách đọc mười hai cho biết có một chục.","Hai đơn vị đứng sau một chục nên viết số 12."],"explanation":"Mười hai được viết bằng chữ số 12.","hint":"Viết chữ số 1 trước rồi viết chữ số 2."},
      {"question_id":"g1-n20-q06","correct_answer":"18","solution_steps":["Một bó que tính có 10 que.","Ghép 8 que rời với bó 10 que được số 18."],"explanation":"Một chục và tám đơn vị tạo thành số 18.","hint":"Bắt đầu từ 10 rồi đếm thêm tám đơn vị."},

      {"question_id":"g1-n20-q07","correct_answer":"B","solution_steps":["Tìm số 15 trên dãy số.","Số đứng ngay trước 15 là 14."],"explanation":"Số 14 nhỏ hơn 15 đúng một đơn vị nên là số liền trước.","hint":"Đếm lùi một bước từ số 15."},
      {"question_id":"g1-n20-q08","correct_answer":"C","solution_steps":["Tìm số 18 trên dãy số.","Số đứng ngay sau 18 là 19."],"explanation":"Số 19 lớn hơn 18 đúng một đơn vị nên là số liền sau.","hint":"Đếm tiếp một bước từ số 18."},
      {"question_id":"g1-n20-q09","correct_answer":"B","solution_steps":["Dãy số tăng thêm một đơn vị mỗi lần: 12 rồi 13.","Số tiếp theo là 14, sau đó mới đến 15."],"explanation":"Số 14 nằm giữa 13 và 15.","hint":"Đếm tiếp một số sau 13."},
      {"question_id":"g1-n20-q10","correct_answer":"B","solution_steps":["Dãy đang đếm lùi: 20, 19, 18.","Đếm lùi thêm một bước từ 18 được 17."],"explanation":"Số tiếp theo trong dãy đếm lùi là 17.","hint":"Mỗi lần giảm một đơn vị."},
      {"question_id":"g1-n20-q11","correct_answer":"17","solution_steps":["Số liền sau lớn hơn số đã cho một đơn vị.","Đếm tiếp từ 16 được 17."],"explanation":"Số 17 đứng ngay sau số 16.","hint":"Nói số tiếp theo khi đếm 15, 16, ..."},
      {"question_id":"g1-n20-q12","correct_answer":"19","solution_steps":["Số liền trước nhỏ hơn số đã cho một đơn vị.","Đếm lùi một bước từ 20 được 19."],"explanation":"Số 19 đứng ngay trước số 20.","hint":"Nhớ hai số cuối khi đếm đến 20."},

      {"question_id":"g1-n20-q13","correct_answer":"A","solution_steps":["So sánh vị trí của 17 và 14 trên dãy số.","Số 17 đứng sau 14 nên 17 lớn hơn 14."],"explanation":"Dấu > biểu thị 17 lớn hơn 14.","hint":"Miệng rộng của dấu quay về số lớn hơn."},
      {"question_id":"g1-n20-q14","correct_answer":"C","solution_steps":["Hai bên đều là cùng một số 12.","Hai số bằng nhau nên dùng dấu =."],"explanation":"Dấu = dùng khi hai số có giá trị bằng nhau.","hint":"Hai chữ số giống hệt nhau cần dấu bằng."},
      {"question_id":"g1-n20-q15","correct_answer":"D","solution_steps":["So sánh bốn số 11, 18, 15 và 13 trên dãy số.","Số 18 đứng xa nhất về bên phải nên là số lớn nhất."],"explanation":"Trong bốn số đã cho, 18 có giá trị lớn nhất.","hint":"Tìm số gần 20 nhất."},
      {"question_id":"g1-n20-q16","correct_answer":"A","solution_steps":["Trong ba số, 11 là số nhỏ nhất và 17 là số lớn nhất.","Đặt 14 vào giữa được thứ tự 11, 14, 17."],"explanation":"Thứ tự 11, 14, 17 đi từ số bé nhất đến số lớn nhất.","hint":"Chọn số nhỏ nhất trước, rồi đến số ở giữa."},
      {"question_id":"g1-n20-q17","correct_answer":"16","solution_steps":["So sánh 20, 16 và 19 trên dãy số.","Số 16 đứng trước hai số còn lại nên là số nhỏ nhất."],"explanation":"Trong ba số đã cho, 16 có giá trị nhỏ nhất.","hint":"Số đứng gần bên trái hơn là số bé hơn."},
      {"question_id":"g1-n20-q18","correct_answer":"15","solution_steps":["So sánh 12, 15 và 9 trên dãy số.","Số 15 đứng sau hai số còn lại nên là số lớn nhất."],"explanation":"Trong ba số đã cho, 15 có giá trị lớn nhất.","hint":"Đếm xem số nào nằm xa nhất về bên phải."},

      {"question_id":"g1-n20-q19","correct_answer":"A","solution_steps":["Chữ số 1 của số 17 biểu thị một chục.","Chữ số 7 biểu thị bảy đơn vị."],"explanation":"Số 17 gồm 1 chục và 7 đơn vị.","hint":"Đọc chữ số hàng chục trước rồi đến hàng đơn vị."},
      {"question_id":"g1-n20-q20","correct_answer":"C","solution_steps":["Một chục được viết bằng chữ số 1 ở hàng chục.","Ba đơn vị được viết bằng chữ số 3 ở hàng đơn vị, tạo thành số 13."],"explanation":"Một chục và ba đơn vị tạo thành số 13.","hint":"Ghép chữ số 1 và chữ số 3 theo đúng thứ tự."},
      {"question_id":"g1-n20-q21","correct_answer":"B","solution_steps":["Số 20 có chữ số 2 ở hàng chục.","Chữ số 0 ở hàng đơn vị nên số 20 gồm 2 chục và 0 đơn vị."],"explanation":"Hai chục đầy đủ tạo thành số 20.","hint":"Quan sát từng chữ số trong số 20."},
      {"question_id":"g1-n20-q22","correct_answer":"B","solution_steps":["Số 10 có chữ số 1 ở hàng chục.","Chữ số 0 ở hàng đơn vị nên số 10 gồm 1 chục và 0 đơn vị."],"explanation":"Một chục đầy đủ chính là số 10.","hint":"Nhìn chữ số bên trái và bên phải của số 10."},
      {"question_id":"g1-n20-q23","correct_answer":"19","solution_steps":["Một chục được viết bằng chữ số 1 ở hàng chục.","Chín đơn vị được viết bằng chữ số 9 ở hàng đơn vị, tạo thành số 19."],"explanation":"Một chục và chín đơn vị tạo thành số 19.","hint":"Viết chữ số chỉ chục trước, chữ số chỉ đơn vị sau."},
      {"question_id":"g1-n20-q24","correct_answer":"4","solution_steps":["Số 14 có chữ số 1 ở hàng chục.","Chữ số 4 ở hàng đơn vị nên số 14 có 4 đơn vị."],"explanation":"Hàng đơn vị của số 14 là chữ số 4.","hint":"Nhìn chữ số đứng bên phải trong số 14."}
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
    unit.slug = 'grade-1-numbers-to-20'
    and unit.grade = 1
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 4
    and unit.prerequisite_unit_slug =
      'grade-1-subtraction-within-10'
    and jsonb_typeof(unit.learning_objectives) = 'array'
    and jsonb_array_length(unit.learning_objectives) >= 5
    and jsonb_typeof(unit.lesson_content -> 'sections') = 'array'
    and jsonb_array_length(unit.lesson_content -> 'sections') = 6
    and jsonb_typeof(
      unit.lesson_content -> 'worked_examples'
    ) = 'array'
    and jsonb_array_length(
      unit.lesson_content -> 'worked_examples'
    ) >= 2;

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
  where question.unit_slug = 'grade-1-numbers-to-20';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-numbers-to-20';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_skill_group_count <> 4
  then
    raise exception 'Grade 1 numbers to 20 seed count validation failed';
  end if;

  if exists (
    select 1
    from (
      select
        question.skill_code,
        count(*) as question_count
      from public.questions as question
      where question.unit_slug = 'grade-1-numbers-to-20'
      group by question.skill_code
    ) as skill
    where skill.question_count <> 6
  ) then
    raise exception 'Grade 1 numbers to 20 skill validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    where
      question.unit_slug = 'grade-1-numbers-to-20'
      and question.skill_code not in (
        'COUNT_READ_WRITE_TO_20',
        'SEQUENCE_TO_20',
        'COMPARE_ORDER_TO_20',
        'TENS_ONES_TO_20'
      )
  ) then
    raise exception 'Grade 1 numbers to 20 unexpected skill validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where
      question.unit_slug = 'grade-1-numbers-to-20'
      and (
        not question.published
        or jsonb_typeof(solution.solution_steps) <> 'array'
        or jsonb_array_length(solution.solution_steps) < 2
        or btrim(solution.explanation) = ''
        or btrim(solution.hint) = ''
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
            or jsonb_typeof(question.options -> 'A') <> 'string'
            or jsonb_typeof(question.options -> 'B') <> 'string'
            or jsonb_typeof(question.options -> 'C') <> 'string'
            or jsonb_typeof(question.options -> 'D') <> 'string'
            or btrim(question.options ->> 'A') = ''
            or btrim(question.options ->> 'B') = ''
            or btrim(question.options ->> 'C') = ''
            or btrim(question.options ->> 'D') = ''
            or not (question.options ? solution.correct_answer)
          )
        )
        or (
          question.question_type = 'NUMBER_INPUT'
          and (
            question.options is not null
            or solution.correct_answer
              !~ '^(0|[1-9]|1[0-9]|20)$'
          )
        )
      )
  ) then
    raise exception 'Grade 1 numbers to 20 content validation failed';
  end if;

  if
    (
      select count(distinct question.code)
      from public.questions as question
      where question.unit_slug = 'grade-1-numbers-to-20'
    ) <> 24
    or (
      select count(distinct question.prompt)
      from public.questions as question
      where question.unit_slug = 'grade-1-numbers-to-20'
    ) <> 24
  then
    raise exception 'Grade 1 numbers to 20 duplicate code or prompt validation failed';
  end if;

  if exists (
    select 1
    from (
      select concat_ws(
        ' ',
        question.prompt,
        question.options::text,
        solution.solution_steps::text,
        solution.explanation,
        solution.hint
      ) as content_text
      from public.questions as question
      join public.question_solutions as solution
        on solution.question_id = question.code
      where question.unit_slug = 'grade-1-numbers-to-20'
    ) as content
    where content.content_text
      ~ '(^|[^0-9])(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})([^0-9]|$)'
  ) then
    raise exception 'Grade 1 numbers to 20 range validation failed';
  end if;

  if exists (
    select 1
    from (
      select concat_ws(
        ' ',
        question.prompt,
        question.options::text,
        solution.solution_steps::text,
        solution.explanation,
        solution.hint
      ) as content_text
      from public.questions as question
      join public.question_solutions as solution
        on solution.question_id = question.code
      where question.unit_slug = 'grade-1-numbers-to-20'
    ) as content
    where
      content.content_text ~ '(^|[^0-9])-[[:space:]]*[0-9]'
      or content.content_text ~ '[0-9][[:space:]]*[×÷*/][[:space:]]*[0-9]'
  ) then
    raise exception 'Grade 1 numbers to 20 pedagogy validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    where
      question.unit_slug = 'grade-1-numbers-to-20'
      and question.prompt
        ~* '(sau đó|tiếp theo).*(thêm|bớt|lấy|cho|ăn|bay)'
  ) then
    raise exception 'Grade 1 numbers to 20 two-step validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as foundation
    join public.learning_units as addition
      on addition.prerequisite_unit_slug = foundation.slug
    join public.learning_units as subtraction
      on subtraction.prerequisite_unit_slug = addition.slug
    join public.learning_units as numbers_to_20
      on numbers_to_20.prerequisite_unit_slug = subtraction.slug
    where
      foundation.slug = 'grade-1-numbers-to-10'
      and foundation.display_order = 1
      and addition.slug = 'grade-1-addition-within-10'
      and addition.display_order = 2
      and subtraction.slug = 'grade-1-subtraction-within-10'
      and subtraction.display_order = 3
      and numbers_to_20.slug = 'grade-1-numbers-to-20'
      and numbers_to_20.display_order = 4
  ) then
    raise exception 'Grade 1 prerequisite chain validation failed';
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
    pg_catalog.has_table_privilege(
      'anon',
      'public.question_solutions',
      'SELECT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'public.start_or_resume_practice(text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
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
