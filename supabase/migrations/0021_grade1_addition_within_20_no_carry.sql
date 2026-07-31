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
    'ONE_STEP_ADDITION_TO_20'
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
  'grade-1-addition-within-20-no-carry',
  1,
  'Phép cộng trong phạm vi 20 không nhớ',
  'Cộng số đến 20 bằng cách giữ nguyên một chục và cộng các đơn vị.',
  $objectives$[
    "Hiểu phép cộng là gộp thêm các số lượng.",
    "Cộng được 10 với một số đơn vị theo hai thứ tự.",
    "Cộng số có hai chữ số với số có một chữ số mà không nhớ.",
    "Dùng chục và đơn vị để giải thích cách cộng.",
    "Giải được bài toán cộng có lời văn một bước trong phạm vi 20."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "review-addition-meaning",
        "title": "Ôn lại ý nghĩa của phép cộng",
        "paragraphs": [
          "Phép cộng giúp tìm tất cả khi hai nhóm được gộp lại hoặc khi một nhóm có thêm đồ vật.",
          "Dấu + đọc là cộng. Dấu = cho biết kết quả của phép tính."
        ]
      },
      {
        "code": "add-ten-and-ones",
        "title": "Cộng 10 với một số",
        "paragraphs": [
          "Một chục và 4 đơn vị tạo thành số 14, nên 10 + 4 = 14.",
          "Đổi vị trí hai số hạng không làm đổi kết quả: 4 + 10 cũng bằng 14."
        ]
      },
      {
        "code": "teen-tens-and-ones",
        "title": "Số có hai chữ số gồm chục và đơn vị",
        "paragraphs": [
          "Số 13 gồm 1 chục và 3 đơn vị. Ta có thể nghĩ 13 là 10 và 3.",
          "Nhìn riêng chục và đơn vị giúp em cộng dễ hơn."
        ]
      },
      {
        "code": "add-teen-and-ones-no-carry",
        "title": "Cộng số có hai chữ số với số có một chữ số",
        "paragraphs": [
          "Khi tổng các đơn vị không quá 9, ta cộng các đơn vị mà không cần tạo thêm chục.",
          "Ví dụ: 12 + 4 có 2 đơn vị thêm 4 đơn vị, được 6 đơn vị."
        ]
      },
      {
        "code": "keep-ten-add-ones",
        "title": "Giữ nguyên một chục và cộng các đơn vị",
        "paragraphs": [
          "Với 15 + 3, ta giữ nguyên 1 chục rồi cộng 5 đơn vị với 3 đơn vị.",
          "Có 1 chục và 8 đơn vị nên kết quả là 18."
        ]
      },
      {
        "code": "one-step-addition-story-to-20",
        "title": "Bài toán có lời văn một bước",
        "paragraphs": [
          "Đọc xem ban đầu có bao nhiêu và được thêm bao nhiêu. Khi có thêm, ta dùng phép cộng.",
          "Viết một phép cộng, tính kết quả rồi trả lời bằng một câu đầy đủ."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Tính 10 + 6",
        "steps": [
          "Số 10 là một chục.",
          "Thêm 6 đơn vị vào một chục.",
          "Một chục và 6 đơn vị tạo thành số 16.",
          "Viết kết quả của phép cộng."
        ],
        "answer": "10 + 6 = 16."
      },
      {
        "title": "Tính 13 + 5",
        "steps": [
          "Tách 13 thành 10 và 3.",
          "Cộng các đơn vị: 3 + 5 = 8.",
          "Giữ nguyên một chục.",
          "Ghép một chục và 8 đơn vị thành số 18.",
          "Viết kết quả của phép cộng."
        ],
        "answer": "13 + 5 = 18."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  5,
  'grade-1-numbers-to-20'
);

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-add20-q01","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 10 + 4 là số nào?","options":{"A":"13","B":"14","C":"15","D":"20"},"skill_code":"ADD_TEN_AND_ONES","difficulty":"EASY","display_order":1},
      {"code":"g1-add20-q02","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 6 + 10 là số nào?","options":{"A":"10","B":"15","C":"16","D":"17"},"skill_code":"ADD_TEN_AND_ONES","difficulty":"EASY","display_order":2},
      {"code":"g1-add20-q03","question_type":"MULTIPLE_CHOICE","prompt":"Phép tính nào có kết quả bằng 17?","options":{"A":"10 + 6","B":"10 + 7","C":"10 + 8","D":"10 + 9"},"skill_code":"ADD_TEN_AND_ONES","difficulty":"EASY","display_order":3},
      {"code":"g1-add20-q04","question_type":"MULTIPLE_CHOICE","prompt":"Phép tính nào có cùng kết quả với 10 + 5?","options":{"A":"5 + 10","B":"10 + 4","C":"6 + 10","D":"5 + 4"},"skill_code":"ADD_TEN_AND_ONES","difficulty":"MEDIUM","display_order":4},
      {"code":"g1-add20-q05","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của 10 + 8.","options":null,"skill_code":"ADD_TEN_AND_ONES","difficulty":"EASY","display_order":5},
      {"code":"g1-add20-q06","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của 9 + 10.","options":null,"skill_code":"ADD_TEN_AND_ONES","difficulty":"EASY","display_order":6},

      {"code":"g1-add20-q07","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 12 + 4 là số nào?","options":{"A":"14","B":"15","C":"16","D":"18"},"skill_code":"ADD_TEEN_AND_ONES_NO_CARRY","difficulty":"EASY","display_order":7},
      {"code":"g1-add20-q08","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 15 + 3 là số nào?","options":{"A":"16","B":"17","C":"18","D":"19"},"skill_code":"ADD_TEEN_AND_ONES_NO_CARRY","difficulty":"EASY","display_order":8},
      {"code":"g1-add20-q09","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 11 + 6 là số nào?","options":{"A":"15","B":"16","C":"17","D":"18"},"skill_code":"ADD_TEEN_AND_ONES_NO_CARRY","difficulty":"EASY","display_order":9},
      {"code":"g1-add20-q10","question_type":"MULTIPLE_CHOICE","prompt":"Phép tính nào có kết quả bằng 19?","options":{"A":"14 + 4","B":"14 + 5","C":"13 + 5","D":"12 + 6"},"skill_code":"ADD_TEEN_AND_ONES_NO_CARRY","difficulty":"MEDIUM","display_order":10},
      {"code":"g1-add20-q11","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của 16 + 2.","options":null,"skill_code":"ADD_TEEN_AND_ONES_NO_CARRY","difficulty":"EASY","display_order":11},
      {"code":"g1-add20-q12","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của 13 + 4.","options":null,"skill_code":"ADD_TEEN_AND_ONES_NO_CARRY","difficulty":"EASY","display_order":12},

      {"code":"g1-add20-q13","question_type":"MULTIPLE_CHOICE","prompt":"Giữ 1 chục và cộng 3 đơn vị với 5 đơn vị. Kết quả của 13 + 5 là số nào?","options":{"A":"17","B":"18","C":"19","D":"20"},"skill_code":"ADD_USING_TENS_ONES","difficulty":"EASY","display_order":13},
      {"code":"g1-add20-q14","question_type":"MULTIPLE_CHOICE","prompt":"Khi tính 12 + 6, em cần cộng các đơn vị bằng phép tính nào?","options":{"A":"2 + 6","B":"1 + 6","C":"2 + 5","D":"1 + 2"},"skill_code":"ADD_USING_TENS_ONES","difficulty":"EASY","display_order":14},
      {"code":"g1-add20-q15","question_type":"MULTIPLE_CHOICE","prompt":"Sau khi tính 14 + 3, kết quả gồm mấy chục và mấy đơn vị?","options":{"A":"1 chục và 7 đơn vị","B":"1 chục và 6 đơn vị","C":"1 chục và 8 đơn vị","D":"2 chục và 0 đơn vị"},"skill_code":"ADD_USING_TENS_ONES","difficulty":"MEDIUM","display_order":15},
      {"code":"g1-add20-q16","question_type":"MULTIPLE_CHOICE","prompt":"Cách tách và cộng nào đúng cho phép tính 16 + 2?","options":{"A":"10 + (6 + 2) = 18","B":"10 + (6 + 1) = 17","C":"10 + (5 + 2) = 17","D":"10 + (6 + 3) = 19"},"skill_code":"ADD_USING_TENS_ONES","difficulty":"MEDIUM","display_order":16},
      {"code":"g1-add20-q17","question_type":"NUMBER_INPUT","prompt":"Số 12 có 2 đơn vị. Thêm 5 đơn vị thì có tất cả bao nhiêu đơn vị?","options":null,"skill_code":"ADD_USING_TENS_ONES","difficulty":"EASY","display_order":17},
      {"code":"g1-add20-q18","question_type":"NUMBER_INPUT","prompt":"Khi tính 15 + 4 và giữ nguyên một chục, phần đơn vị mới là bao nhiêu?","options":null,"skill_code":"ADD_USING_TENS_ONES","difficulty":"MEDIUM","display_order":18},

      {"code":"g1-add20-q19","question_type":"MULTIPLE_CHOICE","prompt":"Lan có 12 quả táo và được cho thêm 3 quả. Lan có tất cả bao nhiêu quả táo?","options":{"A":"13 quả","B":"14 quả","C":"15 quả","D":"16 quả"},"skill_code":"ONE_STEP_ADDITION_TO_20","difficulty":"EASY","display_order":19},
      {"code":"g1-add20-q20","question_type":"MULTIPLE_CHOICE","prompt":"Trên cành có 10 con chim, thêm 8 con bay tới. Có tất cả bao nhiêu con chim?","options":{"A":"16 con","B":"17 con","C":"18 con","D":"20 con"},"skill_code":"ONE_STEP_ADDITION_TO_20","difficulty":"EASY","display_order":20},
      {"code":"g1-add20-q21","question_type":"MULTIPLE_CHOICE","prompt":"Hộp có 14 bút chì, Mai đặt thêm 2 bút. Hộp có tất cả bao nhiêu bút chì?","options":{"A":"14 bút","B":"15 bút","C":"16 bút","D":"18 bút"},"skill_code":"ONE_STEP_ADDITION_TO_20","difficulty":"EASY","display_order":21},
      {"code":"g1-add20-q22","question_type":"MULTIPLE_CHOICE","prompt":"Có 11 quả bóng, thêm 6 quả bóng nữa. Có tất cả bao nhiêu quả bóng?","options":{"A":"15 quả","B":"16 quả","C":"17 quả","D":"18 quả"},"skill_code":"ONE_STEP_ADDITION_TO_20","difficulty":"MEDIUM","display_order":22},
      {"code":"g1-add20-q23","question_type":"NUMBER_INPUT","prompt":"Giỏ có 13 quả cam, mẹ đặt thêm 5 quả. Giỏ có tất cả bao nhiêu quả cam?","options":null,"skill_code":"ONE_STEP_ADDITION_TO_20","difficulty":"EASY","display_order":23},
      {"code":"g1-add20-q24","question_type":"NUMBER_INPUT","prompt":"Có 16 chiếc xe đồ chơi, thêm 3 chiếc nữa. Có tất cả bao nhiêu chiếc xe?","options":null,"skill_code":"ONE_STEP_ADDITION_TO_20","difficulty":"MEDIUM","display_order":24}
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
  'grade-1-addition-within-20-no-carry',
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
      {"question_id":"g1-add20-q01","correct_answer":"B","solution_steps":["Số 10 là một chục.","Thêm 4 đơn vị vào một chục được số 14."],"explanation":"Một chục và bốn đơn vị tạo thành số 14.","hint":"Giữ chữ số 1 ở hàng chục và đặt 4 ở hàng đơn vị."},
      {"question_id":"g1-add20-q02","correct_answer":"C","solution_steps":["Đổi vị trí hai số hạng để nghĩ thành 10 + 6.","Một chục và 6 đơn vị tạo thành số 16."],"explanation":"Phép cộng 6 + 10 có kết quả bằng 16.","hint":"Sáu cộng mười có cùng kết quả với mười cộng sáu."},
      {"question_id":"g1-add20-q03","correct_answer":"B","solution_steps":["Muốn được 17 từ một chục, cần thêm 7 đơn vị.","Vì vậy 10 + 7 = 17."],"explanation":"Một chục và bảy đơn vị tạo thành số 17.","hint":"Nhìn chữ số hàng đơn vị của số 17."},
      {"question_id":"g1-add20-q04","correct_answer":"A","solution_steps":["Đổi vị trí hai số hạng của 10 + 5.","Ta được 5 + 10 và kết quả vẫn là 15."],"explanation":"Đổi chỗ các số hạng không làm thay đổi tổng trong ví dụ này.","hint":"Tìm phép tính có đúng hai số 10 và 5 nhưng đổi vị trí."},
      {"question_id":"g1-add20-q05","correct_answer":"18","solution_steps":["Số 10 là một chục.","Thêm 8 đơn vị được một chục và tám đơn vị, tức số 18."],"explanation":"Mười cộng tám bằng mười tám.","hint":"Ghép một chục với tám đơn vị."},
      {"question_id":"g1-add20-q06","correct_answer":"19","solution_steps":["Đổi vị trí để nghĩ thành 10 + 9.","Một chục và 9 đơn vị tạo thành số 19."],"explanation":"Chín cộng mười bằng mười chín.","hint":"Đổi chỗ hai số rồi ghép một chục với chín đơn vị."},

      {"question_id":"g1-add20-q07","correct_answer":"C","solution_steps":["Số 12 gồm 1 chục và 2 đơn vị.","Cộng 2 đơn vị với 4 đơn vị được 6 đơn vị, nên kết quả là 16."],"explanation":"Một chục và sáu đơn vị tạo thành số 16.","hint":"Giữ nguyên một chục rồi tính 2 + 4."},
      {"question_id":"g1-add20-q08","correct_answer":"C","solution_steps":["Số 15 gồm 1 chục và 5 đơn vị.","Cộng 5 đơn vị với 3 đơn vị được 8 đơn vị, nên kết quả là 18."],"explanation":"Một chục và tám đơn vị tạo thành số 18.","hint":"Giữ một chục rồi cộng năm với ba."},
      {"question_id":"g1-add20-q09","correct_answer":"C","solution_steps":["Số 11 gồm 1 chục và 1 đơn vị.","Cộng 1 đơn vị với 6 đơn vị được 7 đơn vị, nên kết quả là 17."],"explanation":"Một chục và bảy đơn vị tạo thành số 17.","hint":"Tính 1 + 6 rồi giữ nguyên một chục."},
      {"question_id":"g1-add20-q10","correct_answer":"B","solution_steps":["Tính phần đơn vị của 14 + 5: 4 + 5 = 9.","Giữ nguyên một chục, ta được 19."],"explanation":"Chỉ phép cộng 14 + 5 trong các lựa chọn có kết quả bằng 19.","hint":"Tìm phép tính có các đơn vị cộng lại bằng 9."},
      {"question_id":"g1-add20-q11","correct_answer":"18","solution_steps":["Số 16 gồm 1 chục và 6 đơn vị.","Cộng 6 đơn vị với 2 đơn vị được 8 đơn vị, nên kết quả là 18."],"explanation":"Mười sáu cộng hai bằng mười tám.","hint":"Giữ một chục rồi tính 6 + 2."},
      {"question_id":"g1-add20-q12","correct_answer":"17","solution_steps":["Số 13 gồm 1 chục và 3 đơn vị.","Cộng 3 đơn vị với 4 đơn vị được 7 đơn vị, nên kết quả là 17."],"explanation":"Mười ba cộng bốn bằng mười bảy.","hint":"Giữ một chục rồi tính 3 + 4."},

      {"question_id":"g1-add20-q13","correct_answer":"B","solution_steps":["Giữ nguyên một chục của số 13.","Cộng 3 đơn vị với 5 đơn vị được 8 đơn vị, tạo thành số 18."],"explanation":"Một chục và tám đơn vị là số 18.","hint":"Tính ba cộng năm ở hàng đơn vị."},
      {"question_id":"g1-add20-q14","correct_answer":"A","solution_steps":["Số 12 có 2 đơn vị.","Khi thêm 6, ta cộng phần đơn vị bằng 2 + 6."],"explanation":"Ta giữ nguyên một chục và chỉ cộng hai đơn vị với sáu đơn vị.","hint":"Nhìn chữ số hàng đơn vị của số 12."},
      {"question_id":"g1-add20-q15","correct_answer":"A","solution_steps":["Số 14 gồm 1 chục và 4 đơn vị.","Cộng 4 đơn vị với 3 đơn vị được 7 đơn vị, nên kết quả gồm 1 chục và 7 đơn vị."],"explanation":"Phép cộng 14 + 3 tạo thành số 17.","hint":"Giữ một chục rồi cộng bốn với ba."},
      {"question_id":"g1-add20-q16","correct_answer":"A","solution_steps":["Tách số 16 thành 10 và 6.","Cộng 6 với 2 được 8 rồi ghép với 10, nên 10 + (6 + 2) = 18."],"explanation":"Cách tách đúng giữ nguyên một chục và cộng hai phần đơn vị.","hint":"Tìm cách viết giữ số 10 và tính đúng 6 + 2."},
      {"question_id":"g1-add20-q17","correct_answer":"7","solution_steps":["Số 12 có 2 đơn vị.","Thêm 5 đơn vị nên tính 2 + 5 = 7 đơn vị."],"explanation":"Phần đơn vị mới là bảy và chưa tạo thêm chục.","hint":"Chỉ cộng hai đơn vị với năm đơn vị."},
      {"question_id":"g1-add20-q18","correct_answer":"9","solution_steps":["Số 15 có 5 đơn vị.","Thêm 4 đơn vị nên tính 5 + 4 = 9 đơn vị."],"explanation":"Phần đơn vị mới là chín và một chục được giữ nguyên.","hint":"Chỉ cộng năm đơn vị với bốn đơn vị."},

      {"question_id":"g1-add20-q19","correct_answer":"C","solution_steps":["Lan có 12 quả và được thêm 3 quả nên dùng phép cộng.","Tính 12 + 3 = 15, vậy Lan có tất cả 15 quả táo."],"explanation":"Mười hai thêm ba bằng mười lăm.","hint":"Lấy số quả ban đầu cộng với số quả được cho thêm."},
      {"question_id":"g1-add20-q20","correct_answer":"C","solution_steps":["Có 10 con chim và thêm 8 con bay tới.","Tính 10 + 8 = 18, vậy có tất cả 18 con chim."],"explanation":"Một chục và tám đơn vị tạo thành mười tám.","hint":"Ghép mười con ban đầu với tám con mới tới."},
      {"question_id":"g1-add20-q21","correct_answer":"C","solution_steps":["Hộp có 14 bút và được đặt thêm 2 bút.","Tính 14 + 2 = 16, vậy hộp có tất cả 16 bút chì."],"explanation":"Mười bốn thêm hai bằng mười sáu.","hint":"Giữ một chục rồi cộng bốn với hai."},
      {"question_id":"g1-add20-q22","correct_answer":"C","solution_steps":["Có 11 quả bóng và thêm 6 quả nữa.","Tính 11 + 6 = 17, vậy có tất cả 17 quả bóng."],"explanation":"Mười một thêm sáu bằng mười bảy.","hint":"Giữ một chục rồi cộng một với sáu."},
      {"question_id":"g1-add20-q23","correct_answer":"18","solution_steps":["Giỏ có 13 quả cam và mẹ đặt thêm 5 quả.","Tính 13 + 5 = 18, vậy giỏ có tất cả 18 quả cam."],"explanation":"Mười ba thêm năm bằng mười tám.","hint":"Giữ một chục rồi cộng ba với năm."},
      {"question_id":"g1-add20-q24","correct_answer":"19","solution_steps":["Có 16 chiếc xe và thêm 3 chiếc nữa.","Tính 16 + 3 = 19, vậy có tất cả 19 chiếc xe."],"explanation":"Mười sáu thêm ba bằng mười chín.","hint":"Giữ một chục rồi cộng sáu với ba."}
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
    unit.slug = 'grade-1-addition-within-20-no-carry'
    and unit.grade = 1
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 5
    and unit.prerequisite_unit_slug = 'grade-1-numbers-to-20'
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
  where question.unit_slug = 'grade-1-addition-within-20-no-carry';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-addition-within-20-no-carry';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_skill_group_count <> 4
  then
    raise exception 'Grade 1 addition to 20 seed count validation failed';
  end if;

  if exists (
    select 1
    from (
      select
        question.skill_code,
        count(*) as question_count
      from public.questions as question
      where question.unit_slug =
        'grade-1-addition-within-20-no-carry'
      group by question.skill_code
    ) as skill
    where skill.question_count <> 6
  ) then
    raise exception 'Grade 1 addition to 20 skill validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    where
      question.unit_slug = 'grade-1-addition-within-20-no-carry'
      and question.skill_code not in (
        'ADD_TEN_AND_ONES',
        'ADD_TEEN_AND_ONES_NO_CARRY',
        'ADD_USING_TENS_ONES',
        'ONE_STEP_ADDITION_TO_20'
      )
  ) then
    raise exception 'Grade 1 addition to 20 unexpected skill validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where
      question.unit_slug = 'grade-1-addition-within-20-no-carry'
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
    raise exception 'Grade 1 addition to 20 content validation failed';
  end if;

  if
    (
      select count(distinct question.code)
      from public.questions as question
      where question.unit_slug =
        'grade-1-addition-within-20-no-carry'
    ) <> 24
    or (
      select count(distinct question.prompt)
      from public.questions as question
      where question.unit_slug =
        'grade-1-addition-within-20-no-carry'
    ) <> 24
  then
    raise exception 'Grade 1 addition to 20 duplicate validation failed';
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
      where question.unit_slug =
        'grade-1-addition-within-20-no-carry'
    ) as content
    where content.content_text
      ~ '(^|[^0-9])(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})([^0-9]|$)'
  ) then
    raise exception 'Grade 1 addition to 20 range validation failed';
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
      where question.unit_slug =
        'grade-1-addition-within-20-no-carry'
    ) as content
    where
      content.content_text ~ '(^|[^0-9])-[[:space:]]*[0-9]'
      or content.content_text ~ '[0-9][[:space:]]*[×÷*/][[:space:]]*[0-9]'
  ) then
    raise exception 'Grade 1 addition to 20 pedagogy validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    where
      question.unit_slug = 'grade-1-addition-within-20-no-carry'
      and question.prompt
        ~* '(sau đó|tiếp theo).*(thêm|bớt|lấy|cho|ăn|bay)'
  ) then
    raise exception 'Grade 1 addition to 20 two-step validation failed';
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
      where question.unit_slug =
        'grade-1-addition-within-20-no-carry'
    ) as content
    cross join lateral pg_catalog.regexp_matches(
      content.content_text,
      '([0-9]+)[[:space:]]*[+][[:space:]]*([0-9]+)',
      'g'
    ) as expression(parts)
    where
      (expression.parts)[1]::integer
        + (expression.parts)[2]::integer > 20
      or (
        (expression.parts)[1]::integer < 10
        and (expression.parts)[2]::integer < 10
        and (expression.parts)[1]::integer
          + (expression.parts)[2]::integer > 9
      )
      or (
        (expression.parts)[1]::integer between 10 and 19
        and (expression.parts)[2]::integer < 10
        and mod((expression.parts)[1]::integer, 10)
          + (expression.parts)[2]::integer > 9
      )
      or (
        (expression.parts)[2]::integer between 10 and 19
        and (expression.parts)[1]::integer < 10
        and (expression.parts)[1]::integer
          + mod((expression.parts)[2]::integer, 10) > 9
      )
      or (
        (expression.parts)[1]::integer >= 10
        and (expression.parts)[2]::integer >= 10
      )
  ) then
    raise exception 'Grade 1 addition to 20 no-carry validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as foundation
    join public.learning_units as addition_to_10
      on addition_to_10.prerequisite_unit_slug = foundation.slug
    join public.learning_units as subtraction_to_10
      on subtraction_to_10.prerequisite_unit_slug =
        addition_to_10.slug
    join public.learning_units as numbers_to_20
      on numbers_to_20.prerequisite_unit_slug =
        subtraction_to_10.slug
    join public.learning_units as addition_to_20
      on addition_to_20.prerequisite_unit_slug = numbers_to_20.slug
    where
      foundation.slug = 'grade-1-numbers-to-10'
      and foundation.display_order = 1
      and addition_to_10.slug = 'grade-1-addition-within-10'
      and addition_to_10.display_order = 2
      and subtraction_to_10.slug = 'grade-1-subtraction-within-10'
      and subtraction_to_10.display_order = 3
      and numbers_to_20.slug = 'grade-1-numbers-to-20'
      and numbers_to_20.display_order = 4
      and addition_to_20.slug =
        'grade-1-addition-within-20-no-carry'
      and addition_to_20.display_order = 5
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
