begin;

alter table public.questions
drop constraint if exists questions_skill_code_check;

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
    'COMPARE_ORDER_TO_100',
    'ADD_TENS_WITHIN_100',
    'ADD_TWO_DIGIT_NO_CARRY',
    'MISSING_NUMBER_ADDITION_100',
    'ADDITION_WORD_PROBLEM_100'
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
  'grade-1-addition-within-100-no-carry',
  1,
  'Phép cộng trong phạm vi 100 không nhớ',
  'Cộng các số trong phạm vi 100 bằng cách cộng chục với chục, đơn vị với đơn vị và không nhớ sang hàng chục.',
  $objectives$[
    "Ôn lại cấu tạo số theo chục và đơn vị.",
    "Cộng được các số tròn chục trong phạm vi 100.",
    "Cộng được số có hai chữ số với số có một chữ số mà không nhớ.",
    "Cộng được hai số có hai chữ số mà không nhớ.",
    "Tìm được số còn thiếu trong phép cộng đơn giản.",
    "Giải được bài toán có lời văn một bước bằng phép cộng."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "review-tens-and-ones",
        "title": "Ôn lại chục và đơn vị",
        "paragraphs": [
          "Mỗi số có hai chữ số gồm hàng chục và hàng đơn vị. Số 34 gồm 3 chục và 4 đơn vị.",
          "Khi cộng không nhớ, ta có thể cộng các chục với nhau và cộng các đơn vị với nhau."
        ]
      },
      {
        "code": "add-round-tens",
        "title": "Cộng các số tròn chục",
        "paragraphs": [
          "Các số tròn chục có chữ số hàng đơn vị là 0. Ta cộng số chục rồi viết thêm chữ số 0 ở hàng đơn vị.",
          "Ví dụ: 20 + 30 = 50 vì 2 chục thêm 3 chục bằng 5 chục."
        ]
      },
      {
        "code": "add-two-digit-and-one-digit",
        "title": "Số có hai chữ số cộng số có một chữ số",
        "paragraphs": [
          "Giữ nguyên số chục và cộng số đơn vị. Ví dụ: 34 + 5 = 39 vì 4 đơn vị thêm 5 đơn vị bằng 9 đơn vị.",
          "Trong bài này, tổng các chữ số hàng đơn vị luôn nhỏ hơn 10 nên không cần đổi 10 đơn vị thành 1 chục."
        ]
      },
      {
        "code": "add-two-two-digit-numbers",
        "title": "Cộng hai số có hai chữ số không nhớ",
        "paragraphs": [
          "Cộng hàng đơn vị trước, rồi cộng hàng chục. Đặt các chữ số cùng hàng thẳng với nhau khi cần.",
          "Ví dụ: 23 + 34 = 57 vì 3 + 4 = 7 ở hàng đơn vị và 2 chục + 3 chục = 5 chục."
        ]
      },
      {
        "code": "find-missing-number",
        "title": "Tìm số còn thiếu trong phép cộng",
        "paragraphs": [
          "Ta đọc phép cộng và hỏi cần thêm bao nhiêu để được tổng đã cho.",
          "Ví dụ: 20 + □ = 70. Hai chục cần thêm năm chục để thành bảy chục, nên số còn thiếu là 50."
        ]
      },
      {
        "code": "one-step-word-problem",
        "title": "Giải bài toán có lời văn một bước",
        "paragraphs": [
          "Khi hai nhóm đồ vật được gộp lại, ta dùng phép cộng để tìm tất cả.",
          "Đọc kỹ dữ kiện, viết một phép cộng phù hợp, tính theo chục và đơn vị rồi trả lời bằng một câu đầy đủ."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Tính 34 + 25",
        "steps": [
          "Tách 34 thành 3 chục và 4 đơn vị; tách 25 thành 2 chục và 5 đơn vị.",
          "Cộng đơn vị: 4 + 5 = 9. Tổng này nhỏ hơn 10 nên không cần nhớ.",
          "Cộng chục: 3 chục + 2 chục = 5 chục.",
          "Ghép 5 chục và 9 đơn vị được số 59."
        ],
        "answer": "34 + 25 = 59."
      },
      {
        "title": "Hai ngăn có tất cả bao nhiêu quyển sách?",
        "steps": [
          "Ngăn thứ nhất có 42 quyển và ngăn thứ hai có 16 quyển, nên dùng phép cộng 42 + 16.",
          "Cộng đơn vị: 2 + 6 = 8.",
          "Cộng chục: 4 chục + 1 chục = 5 chục.",
          "Ghép 5 chục và 8 đơn vị được 58."
        ],
        "answer": "Hai ngăn có tất cả 58 quyển sách."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  8,
  'grade-1-numbers-to-100'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-add100-q01","question_type":"MULTIPLE_CHOICE","prompt":"Tính 20 + 30.","options":{"A":"40","B":"50","C":"60","D":"70"},"skill_code":"ADD_TENS_WITHIN_100","difficulty":"EASY","display_order":1,"left_operand":20,"right_operand":30,"answer_role":"SUM","expected_answer":50},
      {"code":"g1-add100-q02","question_type":"MULTIPLE_CHOICE","prompt":"Tính 40 + 50.","options":{"A":"70","B":"80","C":"90","D":"100"},"skill_code":"ADD_TENS_WITHIN_100","difficulty":"EASY","display_order":2,"left_operand":40,"right_operand":50,"answer_role":"SUM","expected_answer":90},
      {"code":"g1-add100-q03","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 10 + 70 là số nào?","options":{"A":"17","B":"70","C":"80","D":"90"},"skill_code":"ADD_TENS_WITHIN_100","difficulty":"EASY","display_order":3,"left_operand":10,"right_operand":70,"answer_role":"SUM","expected_answer":80},
      {"code":"g1-add100-q04","question_type":"MULTIPLE_CHOICE","prompt":"Sáu chục thêm hai chục được bao nhiêu?","options":{"A":"60","B":"70","C":"80","D":"90"},"skill_code":"ADD_TENS_WITHIN_100","difficulty":"MEDIUM","display_order":4,"left_operand":60,"right_operand":20,"answer_role":"SUM","expected_answer":80},
      {"code":"g1-add100-q05","question_type":"NUMBER_INPUT","prompt":"Nhập kết quả của 30 + 40.","options":null,"skill_code":"ADD_TENS_WITHIN_100","difficulty":"EASY","display_order":5,"left_operand":30,"right_operand":40,"answer_role":"SUM","expected_answer":70},
      {"code":"g1-add100-q06","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả: 50 + 50.","options":null,"skill_code":"ADD_TENS_WITHIN_100","difficulty":"MEDIUM","display_order":6,"left_operand":50,"right_operand":50,"answer_role":"SUM","expected_answer":100},

      {"code":"g1-add100-q07","question_type":"MULTIPLE_CHOICE","prompt":"Tính 34 + 5.","options":{"A":"37","B":"38","C":"39","D":"40"},"skill_code":"ADD_TWO_DIGIT_NO_CARRY","difficulty":"EASY","display_order":7,"left_operand":34,"right_operand":5,"answer_role":"SUM","expected_answer":39},
      {"code":"g1-add100-q08","question_type":"MULTIPLE_CHOICE","prompt":"Tính 42 + 16.","options":{"A":"48","B":"57","C":"58","D":"68"},"skill_code":"ADD_TWO_DIGIT_NO_CARRY","difficulty":"MEDIUM","display_order":8,"left_operand":42,"right_operand":16,"answer_role":"SUM","expected_answer":58},
      {"code":"g1-add100-q09","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 23 + 34 là số nào?","options":{"A":"47","B":"56","C":"57","D":"67"},"skill_code":"ADD_TWO_DIGIT_NO_CARRY","difficulty":"MEDIUM","display_order":9,"left_operand":23,"right_operand":34,"answer_role":"SUM","expected_answer":57},
      {"code":"g1-add100-q10","question_type":"MULTIPLE_CHOICE","prompt":"Tính 71 + 8.","options":{"A":"78","B":"79","C":"80","D":"89"},"skill_code":"ADD_TWO_DIGIT_NO_CARRY","difficulty":"EASY","display_order":10,"left_operand":71,"right_operand":8,"answer_role":"SUM","expected_answer":79},
      {"code":"g1-add100-q11","question_type":"NUMBER_INPUT","prompt":"Nhập kết quả của 52 + 27.","options":null,"skill_code":"ADD_TWO_DIGIT_NO_CARRY","difficulty":"MEDIUM","display_order":11,"left_operand":52,"right_operand":27,"answer_role":"SUM","expected_answer":79},
      {"code":"g1-add100-q12","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả: 63 + 14.","options":null,"skill_code":"ADD_TWO_DIGIT_NO_CARRY","difficulty":"MEDIUM","display_order":12,"left_operand":63,"right_operand":14,"answer_role":"SUM","expected_answer":77},

      {"code":"g1-add100-q13","question_type":"MULTIPLE_CHOICE","prompt":"Số nào thích hợp vào ô trống: 20 + □ = 70?","options":{"A":"40","B":"50","C":"60","D":"90"},"skill_code":"MISSING_NUMBER_ADDITION_100","difficulty":"EASY","display_order":13,"left_operand":20,"right_operand":50,"answer_role":"RIGHT","expected_answer":50},
      {"code":"g1-add100-q14","question_type":"MULTIPLE_CHOICE","prompt":"Điền số còn thiếu: □ + 30 = 80.","options":{"A":"40","B":"50","C":"60","D":"70"},"skill_code":"MISSING_NUMBER_ADDITION_100","difficulty":"EASY","display_order":14,"left_operand":50,"right_operand":30,"answer_role":"LEFT","expected_answer":50},
      {"code":"g1-add100-q15","question_type":"MULTIPLE_CHOICE","prompt":"Số nào làm cho phép tính 34 + □ = 39 đúng?","options":{"A":"4","B":"5","C":"6","D":"9"},"skill_code":"MISSING_NUMBER_ADDITION_100","difficulty":"MEDIUM","display_order":15,"left_operand":34,"right_operand":5,"answer_role":"RIGHT","expected_answer":5},
      {"code":"g1-add100-q16","question_type":"MULTIPLE_CHOICE","prompt":"Tìm số còn thiếu trong phép tính □ + 24 = 57.","options":{"A":"23","B":"31","C":"33","D":"43"},"skill_code":"MISSING_NUMBER_ADDITION_100","difficulty":"MEDIUM","display_order":16,"left_operand":33,"right_operand":24,"answer_role":"LEFT","expected_answer":33},
      {"code":"g1-add100-q17","question_type":"NUMBER_INPUT","prompt":"Nhập số còn thiếu: 62 + □ = 69.","options":null,"skill_code":"MISSING_NUMBER_ADDITION_100","difficulty":"MEDIUM","display_order":17,"left_operand":62,"right_operand":7,"answer_role":"RIGHT","expected_answer":7},
      {"code":"g1-add100-q18","question_type":"NUMBER_INPUT","prompt":"Tìm số thích hợp để □ + 15 = 48.","options":null,"skill_code":"MISSING_NUMBER_ADDITION_100","difficulty":"MEDIUM","display_order":18,"left_operand":33,"right_operand":15,"answer_role":"LEFT","expected_answer":33},

      {"code":"g1-add100-q19","question_type":"MULTIPLE_CHOICE","prompt":"Hộp có 30 viên bi đỏ và 20 viên bi xanh. Hộp có tất cả bao nhiêu viên bi?","options":{"A":"40 viên","B":"50 viên","C":"60 viên","D":"70 viên"},"skill_code":"ADDITION_WORD_PROBLEM_100","difficulty":"EASY","display_order":19,"left_operand":30,"right_operand":20,"answer_role":"SUM","expected_answer":50},
      {"code":"g1-add100-q20","question_type":"MULTIPLE_CHOICE","prompt":"Ngăn thứ nhất có 42 quyển sách, ngăn thứ hai có 16 quyển sách. Hai ngăn có tất cả bao nhiêu quyển?","options":{"A":"48 quyển","B":"57 quyển","C":"58 quyển","D":"68 quyển"},"skill_code":"ADDITION_WORD_PROBLEM_100","difficulty":"MEDIUM","display_order":20,"left_operand":42,"right_operand":16,"answer_role":"SUM","expected_answer":58},
      {"code":"g1-add100-q21","question_type":"MULTIPLE_CHOICE","prompt":"Mai có 51 nhãn dán và được tặng thêm 8 nhãn dán. Mai có tất cả bao nhiêu nhãn dán?","options":{"A":"58 nhãn","B":"59 nhãn","C":"60 nhãn","D":"69 nhãn"},"skill_code":"ADDITION_WORD_PROBLEM_100","difficulty":"EASY","display_order":21,"left_operand":51,"right_operand":8,"answer_role":"SUM","expected_answer":59},
      {"code":"g1-add100-q22","question_type":"MULTIPLE_CHOICE","prompt":"Vườn trước có 23 cây non, vườn sau có 34 cây non. Cả hai vườn có bao nhiêu cây non?","options":{"A":"47 cây","B":"56 cây","C":"57 cây","D":"67 cây"},"skill_code":"ADDITION_WORD_PROBLEM_100","difficulty":"MEDIUM","display_order":22,"left_operand":23,"right_operand":34,"answer_role":"SUM","expected_answer":57},
      {"code":"g1-add100-q23","question_type":"NUMBER_INPUT","prompt":"Lớp có 60 bút chì màu và 30 bút chì đen. Có tất cả bao nhiêu bút chì?","options":null,"skill_code":"ADDITION_WORD_PROBLEM_100","difficulty":"EASY","display_order":23,"left_operand":60,"right_operand":30,"answer_role":"SUM","expected_answer":90},
      {"code":"g1-add100-q24","question_type":"NUMBER_INPUT","prompt":"Giỏ lớn có 72 khối gỗ, giỏ nhỏ có 7 khối gỗ. Hai giỏ có tất cả bao nhiêu khối gỗ?","options":null,"skill_code":"ADDITION_WORD_PROBLEM_100","difficulty":"MEDIUM","display_order":24,"left_operand":72,"right_operand":7,"answer_role":"SUM","expected_answer":79}
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
  'grade-1-addition-within-100-no-carry',
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
      {"question_id":"g1-add100-q01","correct_answer":"B","solution_steps":["Hai chục cộng ba chục: 2 chục + 3 chục = 5 chục.","Năm chục được viết là 50, nên 20 + 30 = 50."],"explanation":"Cộng các chục với nhau được năm chục.","hint":"Hãy cộng 2 chục với 3 chục."},
      {"question_id":"g1-add100-q02","correct_answer":"C","solution_steps":["Bốn chục cộng năm chục: 4 chục + 5 chục = 9 chục.","Chín chục được viết là 90, nên 40 + 50 = 90."],"explanation":"Cộng hai số tròn chục bằng cách cộng số chục.","hint":"Đếm thêm năm chục từ bốn chục."},
      {"question_id":"g1-add100-q03","correct_answer":"C","solution_steps":["Một chục cộng bảy chục: 1 chục + 7 chục = 8 chục.","Tám chục là 80, nên 10 + 70 = 80."],"explanation":"Một chục và bảy chục gộp lại thành tám chục.","hint":"Cộng 1 với 7 rồi viết thêm chữ số 0."},
      {"question_id":"g1-add100-q04","correct_answer":"C","solution_steps":["Sáu chục thêm hai chục: 6 chục + 2 chục = 8 chục.","Tám chục là 80, nên 60 + 20 = 80."],"explanation":"Sáu chục và hai chục tạo thành tám chục.","hint":"Đếm theo chục từ 60 thêm hai lần."},
      {"question_id":"g1-add100-q05","correct_answer":"70","solution_steps":["Ba chục cộng bốn chục: 3 chục + 4 chục = 7 chục.","Bảy chục là 70, nên 30 + 40 = 70."],"explanation":"Tổng của ba chục và bốn chục là bảy chục.","hint":"Cộng 3 chục với 4 chục."},
      {"question_id":"g1-add100-q06","correct_answer":"100","solution_steps":["Năm chục cộng năm chục: 5 chục + 5 chục = 10 chục.","Mười chục tạo thành 100, nên 50 + 50 = 100."],"explanation":"Hai nhóm năm chục gộp lại thành một trăm.","hint":"Đếm thêm năm chục từ số 50."},

      {"question_id":"g1-add100-q07","correct_answer":"C","solution_steps":["Số 34 có 3 chục và 4 đơn vị; cộng thêm 5 đơn vị.","Cộng đơn vị: 4 + 5 = 9, giữ nguyên 3 chục nên 34 + 5 = 39."],"explanation":"Bốn đơn vị thêm năm đơn vị thành chín đơn vị, không cần nhớ.","hint":"Giữ nguyên ba chục rồi cộng các đơn vị."},
      {"question_id":"g1-add100-q08","correct_answer":"C","solution_steps":["Cộng đơn vị: 2 + 6 = 8.","Cộng chục: 4 chục + 1 chục = 5 chục; vậy 42 + 16 = 58."],"explanation":"Cộng đúng từng hàng được năm chục và tám đơn vị.","hint":"Cộng hàng đơn vị trước rồi đến hàng chục."},
      {"question_id":"g1-add100-q09","correct_answer":"C","solution_steps":["Cộng đơn vị: 3 + 4 = 7.","Cộng chục: 2 chục + 3 chục = 5 chục; vậy 23 + 34 = 57."],"explanation":"Ba đơn vị và bốn đơn vị chưa đủ một chục nên phép cộng không nhớ.","hint":"Tách mỗi số thành chục và đơn vị."},
      {"question_id":"g1-add100-q10","correct_answer":"B","solution_steps":["Số 71 có 7 chục và 1 đơn vị; cộng thêm 8 đơn vị.","Cộng đơn vị: 1 + 8 = 9, giữ nguyên 7 chục nên 71 + 8 = 79."],"explanation":"Một đơn vị thêm tám đơn vị thành chín đơn vị.","hint":"Giữ nguyên bảy chục và cộng 1 với 8."},
      {"question_id":"g1-add100-q11","correct_answer":"79","solution_steps":["Cộng đơn vị: 2 + 7 = 9.","Cộng chục: 5 chục + 2 chục = 7 chục; vậy 52 + 27 = 79."],"explanation":"Bảy chục và chín đơn vị tạo thành số 79.","hint":"Cộng các đơn vị rồi cộng các chục."},
      {"question_id":"g1-add100-q12","correct_answer":"77","solution_steps":["Cộng đơn vị: 3 + 4 = 7.","Cộng chục: 6 chục + 1 chục = 7 chục; vậy 63 + 14 = 77."],"explanation":"Phép cộng không nhớ cho kết quả bảy chục bảy đơn vị.","hint":"Cộng từng hàng với nhau."},

      {"question_id":"g1-add100-q13","correct_answer":"B","solution_steps":["Ta cần tìm số cộng với 20 để được 70.","Năm chục thêm hai chục thành bảy chục: 20 + 50 = 70, nên số còn thiếu là 50."],"explanation":"Hai chục cần thêm năm chục để thành bảy chục.","hint":"Đếm theo chục từ 20 đến 70."},
      {"question_id":"g1-add100-q14","correct_answer":"B","solution_steps":["Ta cần tìm số cộng với 30 để được 80.","Năm chục thêm ba chục thành tám chục: 50 + 30 = 80, nên điền 50."],"explanation":"Năm chục và ba chục tạo thành tám chục.","hint":"Tìm số chục còn thiếu trước 30."},
      {"question_id":"g1-add100-q15","correct_answer":"B","solution_steps":["Giữ nguyên 3 chục và tìm số đơn vị cần thêm vào 4 để được 9.","Vì 4 + 5 = 9 nên 34 + 5 = 39; số còn thiếu là 5."],"explanation":"Bốn đơn vị cần thêm năm đơn vị để thành chín đơn vị.","hint":"Đếm tiếp từ 4 đến 9."},
      {"question_id":"g1-add100-q16","correct_answer":"C","solution_steps":["Tìm số có hàng đơn vị cộng 4 được 7: 3 + 4 = 7.","Tìm số chục cộng 2 chục được 5 chục: 3 chục + 2 chục = 5 chục; vậy 33 + 24 = 57."],"explanation":"Số còn thiếu có 3 chục và 3 đơn vị, là 33.","hint":"Tìm hàng đơn vị rồi tìm hàng chục của số còn thiếu."},
      {"question_id":"g1-add100-q17","correct_answer":"7","solution_steps":["Giữ nguyên 6 chục và tìm số cộng với 2 đơn vị để được 9 đơn vị.","Vì 2 + 7 = 9 nên 62 + 7 = 69; số còn thiếu là 7."],"explanation":"Hai đơn vị cần thêm bảy đơn vị để thành chín đơn vị.","hint":"Đếm tiếp từ 2 đến 9."},
      {"question_id":"g1-add100-q18","correct_answer":"33","solution_steps":["Tìm hàng đơn vị: số cần tìm có 3 đơn vị vì 3 + 5 = 8.","Tìm hàng chục: số cần tìm có 3 chục vì 3 chục + 1 chục = 4 chục; vậy 33 + 15 = 48."],"explanation":"Số có 3 chục và 3 đơn vị là 33.","hint":"Tìm riêng chữ số hàng đơn vị và hàng chục."},

      {"question_id":"g1-add100-q19","correct_answer":"B","solution_steps":["Gộp 30 viên bi đỏ với 20 viên bi xanh nên dùng phép cộng 30 + 20.","Ba chục cộng hai chục bằng năm chục: 30 + 20 = 50."],"explanation":"Hộp có tất cả 50 viên bi.","hint":"Gộp hai nhóm viên bi bằng phép cộng."},
      {"question_id":"g1-add100-q20","correct_answer":"C","solution_steps":["Gộp số sách của hai ngăn bằng phép cộng 42 + 16.","Cộng đơn vị 2 + 6 = 8 và cộng chục 4 chục + 1 chục = 5 chục, nên 42 + 16 = 58."],"explanation":"Hai ngăn có tất cả 58 quyển sách.","hint":"Cộng số sách ở ngăn thứ nhất với ngăn thứ hai."},
      {"question_id":"g1-add100-q21","correct_answer":"B","solution_steps":["Số nhãn của Mai tăng thêm nên dùng phép cộng 51 + 8.","Cộng đơn vị 1 + 8 = 9, giữ nguyên 5 chục nên 51 + 8 = 59."],"explanation":"Mai có tất cả 59 nhãn dán.","hint":"Giữ nguyên năm chục rồi cộng các đơn vị."},
      {"question_id":"g1-add100-q22","correct_answer":"C","solution_steps":["Gộp cây ở hai vườn bằng phép cộng 23 + 34.","Cộng đơn vị 3 + 4 = 7 và cộng chục 2 chục + 3 chục = 5 chục, nên 23 + 34 = 57."],"explanation":"Cả hai vườn có 57 cây non.","hint":"Cộng cây của vườn trước với cây của vườn sau."},
      {"question_id":"g1-add100-q23","correct_answer":"90","solution_steps":["Gộp hai nhóm bút chì bằng phép cộng 60 + 30.","Sáu chục cộng ba chục bằng chín chục: 60 + 30 = 90."],"explanation":"Lớp có tất cả 90 bút chì.","hint":"Cộng số bút chì màu và bút chì đen."},
      {"question_id":"g1-add100-q24","correct_answer":"79","solution_steps":["Gộp khối gỗ trong hai giỏ bằng phép cộng 72 + 7.","Cộng đơn vị 2 + 7 = 9, giữ nguyên 7 chục nên 72 + 7 = 79."],"explanation":"Hai giỏ có tất cả 79 khối gỗ.","hint":"Giữ nguyên bảy chục rồi cộng hai đơn vị với bảy đơn vị."}
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

do $validation$
declare
  v_unit_count integer;
  v_question_count integer;
  v_solution_count integer;
  v_mcq_count integer;
  v_number_count integer;
  v_skill_count integer;
  v_invalid_skill_count integer;
  v_duplicate_code_count integer;
  v_duplicate_prompt_count integer;
  v_invalid_mcq_count integer;
  v_invalid_number_count integer;
  v_invalid_solution_count integer;
  v_invalid_addition_count integer;
  v_start_definition text;
  v_submit_definition text;
  v_review_definition text;
  v_constraint_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-1-addition-within-100-no-carry'
    and unit.grade = 1
    and unit.title = 'Phép cộng trong phạm vi 100 không nhớ'
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 8
    and unit.prerequisite_unit_slug = 'grade-1-numbers-to-100'
    and pg_catalog.jsonb_typeof(unit.lesson_content -> 'sections') = 'array'
    and pg_catalog.jsonb_array_length(unit.lesson_content -> 'sections') = 6
    and pg_catalog.jsonb_typeof(unit.lesson_content -> 'worked_examples') = 'array'
    and pg_catalog.jsonb_array_length(unit.lesson_content -> 'worked_examples') = 2;

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
    v_skill_count
  from public.questions as question
  where question.unit_slug = 'grade-1-addition-within-100-no-carry';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-addition-within-100-no-carry';

  select count(*)
  into v_invalid_skill_count
  from (
    select question.skill_code, count(*) as question_total
    from public.questions as question
    where question.unit_slug = 'grade-1-addition-within-100-no-carry'
    group by question.skill_code
  ) as skill_group
  where
    skill_group.skill_code not in (
      'ADD_TENS_WITHIN_100',
      'ADD_TWO_DIGIT_NO_CARRY',
      'MISSING_NUMBER_ADDITION_100',
      'ADDITION_WORD_PROBLEM_100'
    )
    or skill_group.question_total <> 6;

  select count(*) - count(distinct question.code)
  into v_duplicate_code_count
  from public.questions as question
  where question.unit_slug = 'grade-1-addition-within-100-no-carry';

  select count(*) - count(distinct question.prompt)
  into v_duplicate_prompt_count
  from public.questions as question
  where question.unit_slug = 'grade-1-addition-within-100-no-carry';

  select count(*)
  into v_invalid_mcq_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-addition-within-100-no-carry'
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
    question.unit_slug = 'grade-1-addition-within-100-no-carry'
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
    question.unit_slug = 'grade-1-addition-within-100-no-carry'
    and (
      not question.published
      or solution.question_id is null
      or solution.correct_answer is null
      or pg_catalog.jsonb_typeof(solution.solution_steps) <> 'array'
      or pg_catalog.jsonb_array_length(solution.solution_steps) < 2
      or btrim(solution.explanation) = ''
      or btrim(solution.hint) = ''
    );

  select count(*)
  into v_invalid_addition_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-addition-within-100-no-carry'
    and (
      not exists (
        select 1
        from pg_catalog.regexp_matches(
          solution.solution_steps::text || ' ' || solution.explanation,
          '([0-9]{1,3})[[:space:]]*[+][[:space:]]*([0-9]{1,3})[[:space:]]*=[[:space:]]*([0-9]{1,3})',
          'g'
        ) as addition_fact(parts)
      )
      or exists (
        select 1
        from pg_catalog.regexp_matches(
          solution.solution_steps::text || ' ' || solution.explanation,
          '([0-9]{1,3})[[:space:]]*[+][[:space:]]*([0-9]{1,3})[[:space:]]*=[[:space:]]*([0-9]{1,3})',
          'g'
        ) as addition_fact(parts)
        where
          addition_fact.parts[1]::integer
            + addition_fact.parts[2]::integer
              <> addition_fact.parts[3]::integer
          or addition_fact.parts[1]::integer
            + addition_fact.parts[2]::integer > 100
          or (
            addition_fact.parts[1]::integer % 10
            + addition_fact.parts[2]::integer % 10
          ) >= 10
      )
    );

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_skill_count <> 4
    or v_invalid_skill_count <> 0
    or v_duplicate_code_count <> 0
    or v_duplicate_prompt_count <> 0
    or v_invalid_mcq_count <> 0
    or v_invalid_number_count <> 0
    or v_invalid_solution_count <> 0
    or v_invalid_addition_count <> 0
  then
    raise exception 'Grade 1 addition-to-100 content validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as prerequisite
    join public.learning_units as current_unit
      on current_unit.prerequisite_unit_slug = prerequisite.slug
    where
      prerequisite.slug = 'grade-1-numbers-to-100'
      and prerequisite.display_order = 7
      and current_unit.slug = 'grade-1-addition-within-100-no-carry'
      and current_unit.display_order = 8
  ) then
    raise exception 'Grade 1 addition-to-100 prerequisite validation failed';
  end if;

  select pg_catalog.pg_get_constraintdef(constraint_row.oid)
  into v_constraint_definition
  from pg_catalog.pg_constraint as constraint_row
  where
    constraint_row.conrelid = 'public.questions'::regclass
    and constraint_row.conname = 'questions_skill_code_check'
    and constraint_row.convalidated;

  if
    v_constraint_definition is null
    or v_constraint_definition !~ 'ADD_TENS_WITHIN_100'
    or v_constraint_definition !~ 'ADD_TWO_DIGIT_NO_CARRY'
    or v_constraint_definition !~ 'MISSING_NUMBER_ADDITION_100'
    or v_constraint_definition !~ 'ADDITION_WORD_PROBLEM_100'
  then
    raise exception 'Grade 1 addition-to-100 skill constraint validation failed';
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
    or v_start_definition !~ 'v_unit_grade <> v_student_grade'
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
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.questions',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.questions',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.questions',
      'DELETE'
    )
  then
    raise exception 'Practice privilege validation failed';
  end if;
end;
$validation$;

commit;
