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
    'ONE_STEP_SUBTRACTION_WORD_PROBLEM'
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
  'grade-1-subtraction-within-10',
  1,
  'Phép trừ trong phạm vi 10',
  'Hiểu phép trừ là bớt đi và tính đúng phần còn lại trong phạm vi 10.',
  $objectives$[
    "Nhận biết phép trừ trong tình huống bớt đi.",
    "Đọc và viết đúng phép tính với dấu - và dấu =.",
    "Tính được hiệu của hai số trong phạm vi 10.",
    "Nhận ra liên hệ đơn giản giữa phép cộng và phép trừ.",
    "Giải được bài toán trừ có lời văn một bước."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "subtraction-means-take-away",
        "title": "Phép trừ là bớt đi",
        "paragraphs": [
          "Khi một nhóm đồ vật được lấy bớt, ta dùng phép trừ để tìm số còn lại.",
          "Ví dụ: Có 5 chấm tròn, bớt 2 chấm tròn thì còn 3 chấm tròn."
        ]
      },
      {
        "code": "minus-and-equals",
        "title": "Dấu trừ và dấu bằng",
        "paragraphs": [
          "Dấu - đọc là trừ và cho biết ta đang bớt đi.",
          "Dấu = đọc là bằng. Phía sau dấu = là kết quả còn lại."
        ]
      },
      {
        "code": "count-what-remains",
        "title": "Đếm phần còn lại",
        "paragraphs": [
          "Có thể dùng vật đếm, che hoặc gạch bớt số đồ vật đã lấy đi.",
          "Sau đó đếm những đồ vật chưa bị lấy để tìm kết quả."
        ]
      },
      {
        "code": "subtract-zero-and-self",
        "title": "Trừ đi 0 và trừ chính số đó",
        "paragraphs": [
          "Một số trừ 0 vẫn bằng chính số đó vì không bớt gì cả.",
          "Một số trừ chính nó bằng 0 vì không còn đồ vật nào."
        ]
      },
      {
        "code": "addition-subtraction-relation",
        "title": "Liên hệ phép cộng và phép trừ",
        "paragraphs": [
          "Phép cộng giúp kiểm tra phép trừ: nếu 3 + 4 = 7 thì 7 - 3 = 4.",
          "Ta có thể tìm số còn thiếu bằng một phép cộng quen thuộc."
        ]
      },
      {
        "code": "one-step-subtraction-story",
        "title": "Bài toán có lời văn một bước",
        "paragraphs": [
          "Đọc xem ban đầu có bao nhiêu và đã bớt đi bao nhiêu.",
          "Viết một phép trừ, tính số còn lại rồi trả lời bằng một câu đầy đủ."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Tính 7 - 3",
        "steps": [
          "Lấy 7 chấm tròn rồi gạch bớt 3 chấm tròn.",
          "Đếm 4 chấm tròn còn lại nên viết 7 - 3 = 4.",
          "Kiểm tra lại bằng phép cộng 4 + 3 = 7."
        ],
        "answer": "7 - 3 = 4."
      },
      {
        "title": "Bài toán về những quả cam",
        "steps": [
          "Trong giỏ có 8 quả cam và mẹ lấy ra 2 quả nên ta dùng phép trừ.",
          "Viết phép tính 8 - 2 = 6.",
          "Trả lời câu hỏi bằng một câu đầy đủ."
        ],
        "answer": "Trong giỏ còn lại 6 quả cam."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  3,
  'grade-1-addition-within-10'
);

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-sub-q01","question_type":"MULTIPLE_CHOICE","prompt":"Có 5 quả táo, lấy bớt 2 quả. Phép tính nào phù hợp?","options":{"A":"5 - 2","B":"5 + 2","C":"5 - 1","D":"5 - 3"},"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":1},
      {"code":"g1-sub-q02","question_type":"MULTIPLE_CHOICE","prompt":"Có 7 con chim, 3 con bay đi. Chọn phép tính để tìm số chim còn lại.","options":{"A":"7 + 3","B":"7 - 3","C":"7 - 2","D":"7 - 4"},"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":2},
      {"code":"g1-sub-q03","question_type":"MULTIPLE_CHOICE","prompt":"Có 6 khối vuông, cất đi 1 khối. Em cần dùng phép tính nào?","options":{"A":"6 + 1","B":"6 - 2","C":"6 - 1","D":"6 - 0"},"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":3},
      {"code":"g1-sub-q04","question_type":"MULTIPLE_CHOICE","prompt":"Tình huống nào được viết bằng phép tính 8 - 3?","options":{"A":"Có 8 bút, cho đi 3 bút","B":"Có 8 bút, thêm 3 bút","C":"Có 3 bút, thêm 5 bút","D":"Có 8 bút, không cho đi bút nào"},"skill_code":"SUBTRACTION_MEANING","difficulty":"MEDIUM","display_order":4},
      {"code":"g1-sub-q05","question_type":"NUMBER_INPUT","prompt":"Có 4 chiếc kẹo, ăn 1 chiếc. Còn lại bao nhiêu chiếc kẹo?","options":null,"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":5},
      {"code":"g1-sub-q06","question_type":"NUMBER_INPUT","prompt":"Có 9 quả bóng, 2 quả bị xì hơi. Còn lại bao nhiêu quả bóng?","options":null,"skill_code":"SUBTRACTION_MEANING","difficulty":"MEDIUM","display_order":6},

      {"code":"g1-sub-q07","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 8 - 3 là số nào?","options":{"A":"4","B":"5","C":"6","D":"8"},"skill_code":"SUBTRACTION_CALCULATION","difficulty":"EASY","display_order":7},
      {"code":"g1-sub-q08","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 6 - 0 là số nào?","options":{"A":"0","B":"5","C":"6","D":"7"},"skill_code":"SUBTRACTION_CALCULATION","difficulty":"EASY","display_order":8},
      {"code":"g1-sub-q09","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 5 - 5 là số nào?","options":{"A":"0","B":"1","C":"5","D":"10"},"skill_code":"SUBTRACTION_CALCULATION","difficulty":"EASY","display_order":9},
      {"code":"g1-sub-q10","question_type":"MULTIPLE_CHOICE","prompt":"Phép trừ nào dưới đây có kết quả bằng 4?","options":{"A":"6 - 2","B":"7 - 2","C":"5 - 2","D":"4 - 2"},"skill_code":"SUBTRACTION_CALCULATION","difficulty":"MEDIUM","display_order":10},
      {"code":"g1-sub-q11","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của phép trừ 10 - 4.","options":null,"skill_code":"SUBTRACTION_CALCULATION","difficulty":"EASY","display_order":11},
      {"code":"g1-sub-q12","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của phép trừ 3 - 2.","options":null,"skill_code":"SUBTRACTION_CALCULATION","difficulty":"EASY","display_order":12},

      {"code":"g1-sub-q13","question_type":"MULTIPLE_CHOICE","prompt":"Biết 3 + 4 = 7. Kết quả của 7 - 3 là số nào?","options":{"A":"3","B":"4","C":"5","D":"7"},"skill_code":"ADDITION_SUBTRACTION_RELATION","difficulty":"EASY","display_order":13},
      {"code":"g1-sub-q14","question_type":"MULTIPLE_CHOICE","prompt":"Biết 2 + 5 = 7. Phép trừ nào giúp tìm lại số 2?","options":{"A":"7 - 5 = 2","B":"7 - 2 = 5","C":"5 - 2 = 3","D":"7 - 0 = 7"},"skill_code":"ADDITION_SUBTRACTION_RELATION","difficulty":"EASY","display_order":14},
      {"code":"g1-sub-q15","question_type":"MULTIPLE_CHOICE","prompt":"Phép cộng nào giúp em tìm kết quả của 9 - 4?","options":{"A":"3 + 5 = 8","B":"4 + 4 = 8","C":"4 + 5 = 9","D":"5 + 5 = 10"},"skill_code":"ADDITION_SUBTRACTION_RELATION","difficulty":"MEDIUM","display_order":15},
      {"code":"g1-sub-q16","question_type":"MULTIPLE_CHOICE","prompt":"Với ba số 6, 2 và 4, phép trừ nào đúng?","options":{"A":"6 - 2 = 4","B":"6 - 2 = 3","C":"4 - 2 = 6","D":"2 - 0 = 4"},"skill_code":"ADDITION_SUBTRACTION_RELATION","difficulty":"MEDIUM","display_order":16},
      {"code":"g1-sub-q17","question_type":"NUMBER_INPUT","prompt":"Biết 3 + 5 = 8. Em hãy tính 8 - 3.","options":null,"skill_code":"ADDITION_SUBTRACTION_RELATION","difficulty":"EASY","display_order":17},
      {"code":"g1-sub-q18","question_type":"NUMBER_INPUT","prompt":"Biết 6 + 2 = 8. Em hãy tính 8 - 6.","options":null,"skill_code":"ADDITION_SUBTRACTION_RELATION","difficulty":"EASY","display_order":18},

      {"code":"g1-sub-q19","question_type":"MULTIPLE_CHOICE","prompt":"Lan có 7 quả bóng, cho bạn 2 quả. Lan còn lại bao nhiêu quả bóng?","options":{"A":"2 quả","B":"5 quả","C":"6 quả","D":"9 quả"},"skill_code":"ONE_STEP_SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":19},
      {"code":"g1-sub-q20","question_type":"MULTIPLE_CHOICE","prompt":"Bể có 10 con cá, 4 con bơi sang bể khác. Bể còn lại bao nhiêu con cá?","options":{"A":"4 con","B":"5 con","C":"6 con","D":"10 con"},"skill_code":"ONE_STEP_SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":20},
      {"code":"g1-sub-q21","question_type":"MULTIPLE_CHOICE","prompt":"Hộp có 6 bút sáp, Mai dùng 1 bút. Trong hộp còn bao nhiêu bút sáp?","options":{"A":"4 bút","B":"5 bút","C":"6 bút","D":"7 bút"},"skill_code":"ONE_STEP_SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":21},
      {"code":"g1-sub-q22","question_type":"MULTIPLE_CHOICE","prompt":"Trên cành có 9 con chim, 5 con bay đi. Còn lại bao nhiêu con chim?","options":{"A":"3 con","B":"4 con","C":"5 con","D":"9 con"},"skill_code":"ONE_STEP_SUBTRACTION_WORD_PROBLEM","difficulty":"MEDIUM","display_order":22},
      {"code":"g1-sub-q23","question_type":"NUMBER_INPUT","prompt":"Có 8 chiếc bánh, ăn 3 chiếc. Còn lại bao nhiêu chiếc bánh?","options":null,"skill_code":"ONE_STEP_SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":23},
      {"code":"g1-sub-q24","question_type":"NUMBER_INPUT","prompt":"Có 5 chiếc ô tô đồ chơi, cho bạn 2 chiếc. Còn lại bao nhiêu chiếc ô tô đồ chơi?","options":null,"skill_code":"ONE_STEP_SUBTRACTION_WORD_PROBLEM","difficulty":"MEDIUM","display_order":24}
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
  'grade-1-subtraction-within-10',
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
      {"question_id":"g1-sub-q01","correct_answer":"A","solution_steps":["Ban đầu có 5 quả táo và lấy bớt 2 quả.","Tình huống bớt đi được viết là 5 - 2."],"explanation":"Phép trừ 5 - 2 biểu diễn đúng việc có năm rồi lấy bớt hai.","hint":"Tìm số quả ban đầu và số quả được lấy bớt."},
      {"question_id":"g1-sub-q02","correct_answer":"B","solution_steps":["Ban đầu có 7 con chim, sau đó 3 con bay đi.","Để tìm số còn lại, viết phép trừ 7 - 3."],"explanation":"Dấu trừ dùng khi một phần của nhóm đã rời đi.","hint":"Số chim ban đầu đứng trước dấu trừ."},
      {"question_id":"g1-sub-q03","correct_answer":"C","solution_steps":["Có sẵn 6 khối vuông.","Cất đi 1 khối nên viết 6 - 1."],"explanation":"Cất bớt một khối khỏi sáu khối là phép trừ 6 - 1.","hint":"Từ “cất đi” cho biết em cần dùng phép trừ."},
      {"question_id":"g1-sub-q04","correct_answer":"A","solution_steps":["Phép tính 8 - 3 bắt đầu với 8 đồ vật.","Tình huống phải bớt 3 đồ vật, nên chọn có 8 bút và cho đi 3 bút."],"explanation":"Cho đi ba chiếc bút làm số bút giảm từ tám xuống còn lại một phần.","hint":"Tìm tình huống có tám đồ vật rồi bớt ba đồ vật."},
      {"question_id":"g1-sub-q05","correct_answer":"3","solution_steps":["Có 4 chiếc kẹo và ăn bớt 1 chiếc.","Đếm số còn lại hoặc tính 4 - 1 = 3."],"explanation":"Bốn bớt một còn ba.","hint":"Gạch bớt một chiếc rồi đếm số kẹo còn lại."},
      {"question_id":"g1-sub-q06","correct_answer":"7","solution_steps":["Có 9 quả bóng và 2 quả bị xì hơi.","Tính 9 - 2 = 7 để tìm số bóng còn lại."],"explanation":"Chín bớt hai còn bảy.","hint":"Đếm lùi hai bước từ số 9."},

      {"question_id":"g1-sub-q07","correct_answer":"B","solution_steps":["Bắt đầu với 8 và bớt 3 đơn vị.","Đếm lùi 7, 6, 5 nên 8 - 3 = 5."],"explanation":"Hiệu của tám và ba là năm.","hint":"Đếm lùi ba bước từ số 8."},
      {"question_id":"g1-sub-q08","correct_answer":"C","solution_steps":["Trừ 0 nghĩa là không bớt đơn vị nào.","Vì vậy 6 - 0 vẫn bằng 6."],"explanation":"Trừ đi 0 không làm thay đổi số ban đầu.","hint":"Không lấy bớt gì thì số lượng vẫn giữ nguyên."},
      {"question_id":"g1-sub-q09","correct_answer":"A","solution_steps":["Có 5 đơn vị và bớt hết cả 5 đơn vị.","Không còn đơn vị nào nên 5 - 5 = 0."],"explanation":"Một số trừ chính nó bằng 0.","hint":"Nếu lấy hết mọi đồ vật thì còn lại bao nhiêu?"},
      {"question_id":"g1-sub-q10","correct_answer":"A","solution_steps":["Tính từng lựa chọn: 6 - 2 = 4 và 7 - 2 = 5.","Các lựa chọn còn lại bằng 3 và 2, nên chọn 6 - 2."],"explanation":"Chỉ phép trừ 6 - 2 có kết quả bằng 4.","hint":"Tính từng phép trừ rồi tìm kết quả bằng 4."},
      {"question_id":"g1-sub-q11","correct_answer":"6","solution_steps":["Bắt đầu từ 10 và bớt 4 đơn vị.","Đếm lùi 9, 8, 7, 6 nên 10 - 4 = 6."],"explanation":"Mười bớt bốn còn sáu.","hint":"Đếm lùi bốn bước từ số 10."},
      {"question_id":"g1-sub-q12","correct_answer":"1","solution_steps":["Có 3 đơn vị và bớt 2 đơn vị.","Đếm lùi 2, 1 nên 3 - 2 = 1."],"explanation":"Ba bớt hai còn một.","hint":"Dùng ba chấm tròn, gạch bớt hai chấm rồi đếm lại."},

      {"question_id":"g1-sub-q13","correct_answer":"B","solution_steps":["Phép cộng 3 + 4 = 7 cho biết 7 gồm 3 và 4.","Bớt phần 3 khỏi 7 thì còn phần 4, nên 7 - 3 = 4."],"explanation":"Phép cộng đã cho giúp tìm nhanh kết quả phép trừ.","hint":"Trong 3 và 4, số nào còn lại khi bớt 3 khỏi 7?"},
      {"question_id":"g1-sub-q14","correct_answer":"A","solution_steps":["Phép cộng 2 + 5 = 7 cho biết 7 gồm 2 và 5.","Bớt 5 khỏi 7 sẽ tìm lại số 2, nên 7 - 5 = 2."],"explanation":"Phép trừ ngược lại phép cộng để tìm một phần đã biết.","hint":"Muốn còn 2 thì cần bớt phần 5 khỏi tổng 7."},
      {"question_id":"g1-sub-q15","correct_answer":"C","solution_steps":["Để tính 9 - 4, tìm số cộng với 4 để được 9.","Vì 4 + 5 = 9 nên 9 - 4 = 5."],"explanation":"Phép cộng 4 + 5 = 9 cho biết phần còn lại là 5.","hint":"Tìm cặp số có một số là 4 và tổng là 9."},
      {"question_id":"g1-sub-q16","correct_answer":"A","solution_steps":["Số 6 được tạo bởi hai phần 2 và 4.","Bớt phần 2 khỏi 6 thì còn phần 4, nên 6 - 2 = 4."],"explanation":"Ba số 6, 2 và 4 tạo thành một phép cộng và hai phép trừ liên quan.","hint":"Bắt đầu với số lớn nhất là 6 rồi bớt một phần."},
      {"question_id":"g1-sub-q17","correct_answer":"5","solution_steps":["Phép cộng 3 + 5 = 8 cho biết 8 gồm 3 và 5.","Bớt 3 khỏi 8 thì còn 5, nên 8 - 3 = 5."],"explanation":"Dùng phép cộng đã biết để tìm phần còn lại.","hint":"Trong phép cộng 3 + 5 = 8, phần nào chưa bị bớt?"},
      {"question_id":"g1-sub-q18","correct_answer":"2","solution_steps":["Phép cộng 6 + 2 = 8 cho biết 8 gồm 6 và 2.","Bớt 6 khỏi 8 thì còn 2, nên 8 - 6 = 2."],"explanation":"Phép cộng đã cho xác nhận kết quả phép trừ là 2.","hint":"Tìm phần còn lại bên cạnh số 6 trong phép cộng."},

      {"question_id":"g1-sub-q19","correct_answer":"B","solution_steps":["Lan có 7 quả bóng và cho đi 2 quả nên dùng phép trừ.","Tính 7 - 2 = 5, vậy Lan còn 5 quả bóng."],"explanation":"Số bóng giảm đi hai nên kết quả là năm.","hint":"Lấy số bóng ban đầu trừ số bóng đã cho bạn."},
      {"question_id":"g1-sub-q20","correct_answer":"C","solution_steps":["Bể có 10 con cá và 4 con bơi sang bể khác.","Tính 10 - 4 = 6, vậy bể còn 6 con cá."],"explanation":"Mười bớt bốn còn sáu.","hint":"Đếm lùi bốn bước từ số 10."},
      {"question_id":"g1-sub-q21","correct_answer":"B","solution_steps":["Hộp có 6 bút sáp và Mai lấy dùng 1 bút.","Tính 6 - 1 = 5, vậy trong hộp còn 5 bút."],"explanation":"Lấy một chiếc khỏi sáu chiếc thì còn năm chiếc.","hint":"Bớt một đơn vị khỏi số 6."},
      {"question_id":"g1-sub-q22","correct_answer":"B","solution_steps":["Trên cành có 9 con chim và 5 con bay đi.","Tính 9 - 5 = 4, vậy còn lại 4 con chim."],"explanation":"Chín bớt năm còn bốn.","hint":"Có thể nhớ 5 + 4 = 9 để tìm số còn lại."},
      {"question_id":"g1-sub-q23","correct_answer":"5","solution_steps":["Có 8 chiếc bánh và ăn bớt 3 chiếc.","Tính 8 - 3 = 5, vậy còn lại 5 chiếc bánh."],"explanation":"Tám bớt ba còn năm.","hint":"Đếm lùi ba bước từ số 8."},
      {"question_id":"g1-sub-q24","correct_answer":"3","solution_steps":["Có 5 chiếc ô tô và cho bạn 2 chiếc.","Tính 5 - 2 = 3, vậy còn lại 3 chiếc ô tô."],"explanation":"Năm bớt hai còn ba.","hint":"Gạch bớt hai chiếc khỏi nhóm năm chiếc rồi đếm lại."}
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
    unit.slug = 'grade-1-subtraction-within-10'
    and unit.grade = 1
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 3
    and unit.prerequisite_unit_slug = 'grade-1-addition-within-10'
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
  where question.unit_slug = 'grade-1-subtraction-within-10';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-subtraction-within-10';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_skill_group_count <> 4
  then
    raise exception 'Grade 1 subtraction seed count validation failed';
  end if;

  if exists (
    select 1
    from (
      select
        question.skill_code,
        count(*) as question_count
      from public.questions as question
      where question.unit_slug = 'grade-1-subtraction-within-10'
      group by question.skill_code
    ) as skill
    where skill.question_count <> 6
  ) then
    raise exception 'Grade 1 subtraction skill distribution validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where
      question.unit_slug = 'grade-1-subtraction-within-10'
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
            or exists (
              select 1
              from jsonb_each(question.options) as option_entry
              where
                jsonb_typeof(option_entry.value) <> 'string'
                or btrim(option_entry.value #>> '{}') = ''
            )
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
    raise exception 'Grade 1 subtraction content validation failed';
  end if;

  if (
    select count(distinct question.prompt)
    from public.questions as question
    where question.unit_slug = 'grade-1-subtraction-within-10'
  ) <> 24 then
    raise exception 'Grade 1 subtraction duplicate prompt validation failed';
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
      where question.unit_slug = 'grade-1-subtraction-within-10'
    ) as content
    where content.content_text
      ~ '(^|[^0-9])(1[1-9]|[2-9][0-9])([^0-9]|$)'
  ) then
    raise exception 'Grade 1 subtraction number range validation failed';
  end if;

  if exists (
    select 1
    from (
      select concat_ws(
        ' ',
        question.prompt,
        question.options::text,
        solution.solution_steps::text,
        solution.explanation
      ) as content_text
      from public.questions as question
      join public.question_solutions as solution
        on solution.question_id = question.code
      where question.unit_slug = 'grade-1-subtraction-within-10'
    ) as content
    cross join lateral pg_catalog.regexp_matches(
      content.content_text,
      '([0-9]+)[[:space:]]*-[[:space:]]*([0-9]+)',
      'g'
    ) as expression(parts)
    where
      (expression.parts)[1]::integer > 10
      or (expression.parts)[2]::integer > 10
      or (expression.parts)[2]::integer > (expression.parts)[1]::integer
  ) then
    raise exception 'Grade 1 subtraction arithmetic validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as foundation
    join public.learning_units as addition
      on addition.prerequisite_unit_slug = foundation.slug
    join public.learning_units as subtraction
      on subtraction.prerequisite_unit_slug = addition.slug
    where
      foundation.slug = 'grade-1-numbers-to-10'
      and foundation.display_order = 1
      and addition.slug = 'grade-1-addition-within-10'
      and addition.display_order = 2
      and subtraction.slug = 'grade-1-subtraction-within-10'
      and subtraction.display_order = 3
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
