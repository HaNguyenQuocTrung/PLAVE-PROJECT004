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
    'ADDITION_WORD_PROBLEM_100',
    'SUBTRACT_TENS_WITHIN_100',
    'SUBTRACT_TWO_DIGIT_NO_BORROW',
    'MISSING_NUMBER_SUBTRACTION_100',
    'SUBTRACTION_WORD_PROBLEM_100'
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
  'grade-1-subtraction-within-100-no-borrow',
  1,
  'Phép trừ trong phạm vi 100 không mượn',
  'Trừ các số trong phạm vi 100 bằng cách bớt chục và đơn vị mà không cần mượn từ hàng chục.',
  $objectives$[
    "Hiểu phép trừ là bớt đi và tìm phần còn lại.",
    "Trừ được các số tròn chục trong phạm vi 100.",
    "Trừ được số có hai chữ số cho số có một chữ số mà không mượn.",
    "Trừ được hai số có hai chữ số mà không mượn.",
    "Tìm được số còn thiếu trong phép trừ đơn giản.",
    "Giải được bài toán có lời văn một bước bằng phép trừ."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "review-tens-and-ones",
        "title": "Ôn lại chục và đơn vị",
        "paragraphs": [
          "Mỗi số có hai chữ số gồm hàng chục và hàng đơn vị. Số 68 gồm 6 chục và 8 đơn vị.",
          "Khi trừ không mượn, ta bớt đơn vị khỏi đơn vị và bớt chục khỏi chục."
        ]
      },
      {
        "code": "subtract-round-tens",
        "title": "Trừ các số tròn chục",
        "paragraphs": [
          "Các số tròn chục có chữ số hàng đơn vị là 0. Ta bớt số chục rồi giữ chữ số 0 ở hàng đơn vị.",
          "Ví dụ: 80 − 30 = 50 vì 8 chục bớt 3 chục còn 5 chục."
        ]
      },
      {
        "code": "subtract-one-digit",
        "title": "Số có hai chữ số trừ số có một chữ số",
        "paragraphs": [
          "Giữ nguyên số chục và bớt ở hàng đơn vị. Ví dụ: 47 − 5 = 42 vì 7 đơn vị bớt 5 đơn vị còn 2 đơn vị.",
          "Trong bài này, số đơn vị bị bớt luôn không lớn hơn số đơn vị đang có nên không cần mượn."
        ]
      },
      {
        "code": "subtract-two-digit",
        "title": "Trừ hai số có hai chữ số không mượn",
        "paragraphs": [
          "Bớt hàng đơn vị trước, rồi bớt hàng chục. Các chữ số cùng hàng cần được đặt thẳng với nhau.",
          "Ví dụ: 68 − 25 = 43 vì 8 đơn vị bớt 5 đơn vị còn 3 đơn vị và 6 chục bớt 2 chục còn 4 chục."
        ]
      },
      {
        "code": "find-missing-number",
        "title": "Tìm số còn thiếu trong phép trừ",
        "paragraphs": [
          "Đọc kỹ để biết ô trống là số bị trừ hay số trừ, rồi thử số tìm được trong phép tính.",
          "Ví dụ: 70 − □ = 40. Bảy chục bớt ba chục còn bốn chục, nên số còn thiếu là 30."
        ]
      },
      {
        "code": "one-step-word-problem",
        "title": "Giải bài toán có lời văn một bước",
        "paragraphs": [
          "Khi một nhóm được lấy bớt đi, ta dùng phép trừ để tìm số còn lại.",
          "Đọc dữ kiện, viết một phép trừ, tính theo chục và đơn vị rồi trả lời bằng một câu đầy đủ."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Tính 68 − 25",
        "steps": [
          "Tách 68 thành 6 chục và 8 đơn vị; tách 25 thành 2 chục và 5 đơn vị.",
          "Trừ đơn vị: 8 − 5 = 3. Tám đơn vị đủ để bớt năm đơn vị nên không cần mượn.",
          "Trừ chục: 6 chục bớt 2 chục còn 4 chục.",
          "Ghép 4 chục và 3 đơn vị được số 43."
        ],
        "answer": "68 − 25 = 43."
      },
      {
        "title": "Trên giá còn lại bao nhiêu quyển sách?",
        "steps": [
          "Trên giá có 75 quyển và đã cho mượn 32 quyển, nên dùng phép trừ 75 − 32.",
          "Trừ đơn vị: 5 − 2 = 3.",
          "Trừ chục: 7 chục bớt 3 chục còn 4 chục.",
          "Ghép 4 chục và 3 đơn vị được 43."
        ],
        "answer": "Trên giá còn lại 43 quyển sách."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  9,
  'grade-1-addition-within-100-no-carry'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-sub100-q01","question_type":"MULTIPLE_CHOICE","prompt":"Tính 80 − 30.","options":{"A":"40","B":"50","C":"60","D":"70"},"skill_code":"SUBTRACT_TENS_WITHIN_100","difficulty":"EASY","display_order":1,"minuend":80,"subtrahend":30,"answer_role":"DIFFERENCE","expected_answer":50},
      {"code":"g1-sub100-q02","question_type":"MULTIPLE_CHOICE","prompt":"Tính 70 − 20.","options":{"A":"40","B":"50","C":"60","D":"90"},"skill_code":"SUBTRACT_TENS_WITHIN_100","difficulty":"EASY","display_order":2,"minuend":70,"subtrahend":20,"answer_role":"DIFFERENCE","expected_answer":50},
      {"code":"g1-sub100-q03","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 100 − 40 là số nào?","options":{"A":"40","B":"50","C":"60","D":"70"},"skill_code":"SUBTRACT_TENS_WITHIN_100","difficulty":"EASY","display_order":3,"minuend":100,"subtrahend":40,"answer_role":"DIFFERENCE","expected_answer":60},
      {"code":"g1-sub100-q04","question_type":"MULTIPLE_CHOICE","prompt":"Sáu chục bớt sáu chục còn bao nhiêu?","options":{"A":"0","B":"10","C":"20","D":"60"},"skill_code":"SUBTRACT_TENS_WITHIN_100","difficulty":"MEDIUM","display_order":4,"minuend":60,"subtrahend":60,"answer_role":"DIFFERENCE","expected_answer":0},
      {"code":"g1-sub100-q05","question_type":"NUMBER_INPUT","prompt":"Nhập kết quả của 90 − 50.","options":null,"skill_code":"SUBTRACT_TENS_WITHIN_100","difficulty":"EASY","display_order":5,"minuend":90,"subtrahend":50,"answer_role":"DIFFERENCE","expected_answer":40},
      {"code":"g1-sub100-q06","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả: 50 − 20.","options":null,"skill_code":"SUBTRACT_TENS_WITHIN_100","difficulty":"EASY","display_order":6,"minuend":50,"subtrahend":20,"answer_role":"DIFFERENCE","expected_answer":30},

      {"code":"g1-sub100-q07","question_type":"MULTIPLE_CHOICE","prompt":"Tính 47 − 5.","options":{"A":"41","B":"42","C":"43","D":"52"},"skill_code":"SUBTRACT_TWO_DIGIT_NO_BORROW","difficulty":"EASY","display_order":7,"minuend":47,"subtrahend":5,"answer_role":"DIFFERENCE","expected_answer":42},
      {"code":"g1-sub100-q08","question_type":"MULTIPLE_CHOICE","prompt":"Tính 68 − 25.","options":{"A":"33","B":"42","C":"43","D":"53"},"skill_code":"SUBTRACT_TWO_DIGIT_NO_BORROW","difficulty":"MEDIUM","display_order":8,"minuend":68,"subtrahend":25,"answer_role":"DIFFERENCE","expected_answer":43},
      {"code":"g1-sub100-q09","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của 95 − 34 là số nào?","options":{"A":"51","B":"60","C":"61","D":"71"},"skill_code":"SUBTRACT_TWO_DIGIT_NO_BORROW","difficulty":"MEDIUM","display_order":9,"minuend":95,"subtrahend":34,"answer_role":"DIFFERENCE","expected_answer":61},
      {"code":"g1-sub100-q10","question_type":"MULTIPLE_CHOICE","prompt":"Tính 76 − 6.","options":{"A":"60","B":"69","C":"70","D":"72"},"skill_code":"SUBTRACT_TWO_DIGIT_NO_BORROW","difficulty":"EASY","display_order":10,"minuend":76,"subtrahend":6,"answer_role":"DIFFERENCE","expected_answer":70},
      {"code":"g1-sub100-q11","question_type":"NUMBER_INPUT","prompt":"Nhập kết quả của 84 − 32.","options":null,"skill_code":"SUBTRACT_TWO_DIGIT_NO_BORROW","difficulty":"MEDIUM","display_order":11,"minuend":84,"subtrahend":32,"answer_role":"DIFFERENCE","expected_answer":52},
      {"code":"g1-sub100-q12","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả: 59 − 17.","options":null,"skill_code":"SUBTRACT_TWO_DIGIT_NO_BORROW","difficulty":"MEDIUM","display_order":12,"minuend":59,"subtrahend":17,"answer_role":"DIFFERENCE","expected_answer":42},

      {"code":"g1-sub100-q13","question_type":"MULTIPLE_CHOICE","prompt":"Số nào thích hợp vào ô trống: 70 − □ = 40?","options":{"A":"20","B":"30","C":"40","D":"50"},"skill_code":"MISSING_NUMBER_SUBTRACTION_100","difficulty":"EASY","display_order":13,"minuend":70,"subtrahend":30,"answer_role":"SUBTRAHEND","expected_answer":30},
      {"code":"g1-sub100-q14","question_type":"MULTIPLE_CHOICE","prompt":"Điền số còn thiếu: □ − 20 = 50.","options":{"A":"30","B":"50","C":"70","D":"90"},"skill_code":"MISSING_NUMBER_SUBTRACTION_100","difficulty":"EASY","display_order":14,"minuend":70,"subtrahend":20,"answer_role":"MINUEND","expected_answer":70},
      {"code":"g1-sub100-q15","question_type":"MULTIPLE_CHOICE","prompt":"Số nào làm cho phép tính 47 − □ = 42 đúng?","options":{"A":"4","B":"5","C":"6","D":"9"},"skill_code":"MISSING_NUMBER_SUBTRACTION_100","difficulty":"MEDIUM","display_order":15,"minuend":47,"subtrahend":5,"answer_role":"SUBTRAHEND","expected_answer":5},
      {"code":"g1-sub100-q16","question_type":"MULTIPLE_CHOICE","prompt":"Tìm số còn thiếu trong phép tính □ − 24 = 53.","options":{"A":"67","B":"73","C":"77","D":"87"},"skill_code":"MISSING_NUMBER_SUBTRACTION_100","difficulty":"MEDIUM","display_order":16,"minuend":77,"subtrahend":24,"answer_role":"MINUEND","expected_answer":77},
      {"code":"g1-sub100-q17","question_type":"NUMBER_INPUT","prompt":"Nhập số còn thiếu: 69 − □ = 62.","options":null,"skill_code":"MISSING_NUMBER_SUBTRACTION_100","difficulty":"MEDIUM","display_order":17,"minuend":69,"subtrahend":7,"answer_role":"SUBTRAHEND","expected_answer":7},
      {"code":"g1-sub100-q18","question_type":"NUMBER_INPUT","prompt":"Tìm số thích hợp để □ − 15 = 33.","options":null,"skill_code":"MISSING_NUMBER_SUBTRACTION_100","difficulty":"MEDIUM","display_order":18,"minuend":48,"subtrahend":15,"answer_role":"MINUEND","expected_answer":48},

      {"code":"g1-sub100-q19","question_type":"MULTIPLE_CHOICE","prompt":"Giỏ có 80 quả táo, đã lấy ra 30 quả. Trong giỏ còn bao nhiêu quả táo?","options":{"A":"40 quả","B":"50 quả","C":"60 quả","D":"70 quả"},"skill_code":"SUBTRACTION_WORD_PROBLEM_100","difficulty":"EASY","display_order":19,"minuend":80,"subtrahend":30,"answer_role":"DIFFERENCE","expected_answer":50},
      {"code":"g1-sub100-q20","question_type":"MULTIPLE_CHOICE","prompt":"Giá sách có 68 quyển, đã cho mượn 25 quyển. Trên giá còn bao nhiêu quyển?","options":{"A":"33 quyển","B":"42 quyển","C":"43 quyển","D":"53 quyển"},"skill_code":"SUBTRACTION_WORD_PROBLEM_100","difficulty":"MEDIUM","display_order":20,"minuend":68,"subtrahend":25,"answer_role":"DIFFERENCE","expected_answer":43},
      {"code":"g1-sub100-q21","question_type":"MULTIPLE_CHOICE","prompt":"Mai có 57 nhãn dán và cho bạn 6 nhãn. Mai còn bao nhiêu nhãn dán?","options":{"A":"50 nhãn","B":"51 nhãn","C":"52 nhãn","D":"63 nhãn"},"skill_code":"SUBTRACTION_WORD_PROBLEM_100","difficulty":"EASY","display_order":21,"minuend":57,"subtrahend":6,"answer_role":"DIFFERENCE","expected_answer":51},
      {"code":"g1-sub100-q22","question_type":"MULTIPLE_CHOICE","prompt":"Vườn có 95 cây non, đã chuyển 34 cây sang nơi khác. Vườn còn bao nhiêu cây non?","options":{"A":"51 cây","B":"60 cây","C":"61 cây","D":"71 cây"},"skill_code":"SUBTRACTION_WORD_PROBLEM_100","difficulty":"MEDIUM","display_order":22,"minuend":95,"subtrahend":34,"answer_role":"DIFFERENCE","expected_answer":61},
      {"code":"g1-sub100-q23","question_type":"NUMBER_INPUT","prompt":"Hộp có 90 bút chì, đã dùng 40 chiếc. Hộp còn bao nhiêu bút chì?","options":null,"skill_code":"SUBTRACTION_WORD_PROBLEM_100","difficulty":"EASY","display_order":23,"minuend":90,"subtrahend":40,"answer_role":"DIFFERENCE","expected_answer":50},
      {"code":"g1-sub100-q24","question_type":"NUMBER_INPUT","prompt":"Có 79 khối gỗ, đã cất đi 7 khối. Còn lại bao nhiêu khối gỗ?","options":null,"skill_code":"SUBTRACTION_WORD_PROBLEM_100","difficulty":"MEDIUM","display_order":24,"minuend":79,"subtrahend":7,"answer_role":"DIFFERENCE","expected_answer":72}
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
  'grade-1-subtraction-within-100-no-borrow',
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
      {"question_id":"g1-sub100-q01","correct_answer":"B","solution_steps":["Tám chục bớt ba chục còn năm chục.","Năm chục là 50, nên 80 − 30 = 50."],"explanation":"Bớt các chục rồi giữ chữ số 0 ở hàng đơn vị.","hint":"Hãy bớt 3 chục khỏi 8 chục."},
      {"question_id":"g1-sub100-q02","correct_answer":"B","solution_steps":["Bảy chục bớt hai chục còn năm chục.","Năm chục là 50, nên 70 − 20 = 50."],"explanation":"Bảy chục bớt hai chục còn lại năm chục.","hint":"Đếm lùi hai chục từ 70."},
      {"question_id":"g1-sub100-q03","correct_answer":"C","solution_steps":["Mười chục bớt bốn chục còn sáu chục.","Sáu chục là 60, nên 100 − 40 = 60."],"explanation":"Một trăm gồm mười chục; bớt bốn chục còn sáu chục.","hint":"Viết 100 thành 10 chục trước khi bớt."},
      {"question_id":"g1-sub100-q04","correct_answer":"A","solution_steps":["Sáu chục bớt hết sáu chục thì không còn chục nào.","Không còn chục và đơn vị nào, nên 60 − 60 = 0."],"explanation":"Một số trừ chính nó bằng 0.","hint":"Bớt toàn bộ sáu chục đang có."},
      {"question_id":"g1-sub100-q05","correct_answer":"40","solution_steps":["Chín chục bớt năm chục còn bốn chục.","Bốn chục là 40, nên 90 − 50 = 40."],"explanation":"Bớt số chục rồi viết kết quả theo chục.","hint":"Đếm lùi năm chục từ 90."},
      {"question_id":"g1-sub100-q06","correct_answer":"30","solution_steps":["Năm chục bớt hai chục còn ba chục.","Ba chục là 30, nên 50 − 20 = 30."],"explanation":"Năm chục bớt hai chục còn lại ba chục.","hint":"Bớt 2 khỏi 5 ở hàng chục."},

      {"question_id":"g1-sub100-q07","correct_answer":"B","solution_steps":["Số 47 có 4 chục và 7 đơn vị; bớt 5 đơn vị khỏi 7 đơn vị còn 2 đơn vị.","Giữ nguyên 4 chục, nên 47 − 5 = 42."],"explanation":"Bảy đơn vị đủ để bớt năm đơn vị nên không cần mượn.","hint":"Giữ nguyên bốn chục rồi bớt các đơn vị."},
      {"question_id":"g1-sub100-q08","correct_answer":"C","solution_steps":["Trừ đơn vị: 8 − 5 = 3.","Trừ chục: 6 chục bớt 2 chục còn 4 chục; vậy 68 − 25 = 43."],"explanation":"Bớt đúng từng hàng được bốn chục và ba đơn vị.","hint":"Trừ hàng đơn vị trước rồi đến hàng chục."},
      {"question_id":"g1-sub100-q09","correct_answer":"C","solution_steps":["Trừ đơn vị: 5 − 4 = 1.","Trừ chục: 9 chục bớt 3 chục còn 6 chục; vậy 95 − 34 = 61."],"explanation":"Năm đơn vị đủ để bớt bốn đơn vị nên phép trừ không mượn.","hint":"Tách mỗi số thành chục và đơn vị."},
      {"question_id":"g1-sub100-q10","correct_answer":"C","solution_steps":["Số 76 có 7 chục và 6 đơn vị; bớt hết 6 đơn vị thì còn 0 đơn vị.","Giữ nguyên 7 chục, nên 76 − 6 = 70."],"explanation":"Sáu đơn vị bớt sáu đơn vị còn không đơn vị.","hint":"Giữ nguyên bảy chục và bớt các đơn vị."},
      {"question_id":"g1-sub100-q11","correct_answer":"52","solution_steps":["Trừ đơn vị: 4 − 2 = 2.","Trừ chục: 8 chục bớt 3 chục còn 5 chục; vậy 84 − 32 = 52."],"explanation":"Năm chục và hai đơn vị tạo thành số 52.","hint":"Bớt các đơn vị rồi bớt các chục."},
      {"question_id":"g1-sub100-q12","correct_answer":"42","solution_steps":["Trừ đơn vị: 9 − 7 = 2.","Trừ chục: 5 chục bớt 1 chục còn 4 chục; vậy 59 − 17 = 42."],"explanation":"Phép trừ không mượn cho kết quả bốn chục hai đơn vị.","hint":"Trừ từng hàng với nhau."},

      {"question_id":"g1-sub100-q13","correct_answer":"B","solution_steps":["Ta cần tìm số được bớt khỏi 70 để còn 40.","Vì 70 − 30 = 40 nên số còn thiếu là 30."],"explanation":"Bảy chục bớt ba chục còn bốn chục.","hint":"Tìm số chục nằm giữa 70 và 40."},
      {"question_id":"g1-sub100-q14","correct_answer":"C","solution_steps":["Ta cần tìm số mà khi bớt 20 sẽ còn 50.","Vì 70 − 20 = 50 nên số còn thiếu là 70."],"explanation":"Bảy chục bớt hai chục còn năm chục.","hint":"Tìm số chục đứng trước khi bớt 2 chục."},
      {"question_id":"g1-sub100-q15","correct_answer":"B","solution_steps":["Giữ nguyên 4 chục và tìm số cần bớt khỏi 7 đơn vị để còn 2 đơn vị.","Vì 47 − 5 = 42 nên số còn thiếu là 5."],"explanation":"Bảy đơn vị bớt năm đơn vị còn hai đơn vị.","hint":"Đếm lùi từ 7 đến 2."},
      {"question_id":"g1-sub100-q16","correct_answer":"C","solution_steps":["Tìm hàng đơn vị: 7 đơn vị bớt 4 đơn vị còn 3 đơn vị.","Tìm hàng chục: 7 chục bớt 2 chục còn 5 chục; vì 77 − 24 = 53 nên điền 77."],"explanation":"Số bị trừ có 7 chục và 7 đơn vị.","hint":"Tìm hàng đơn vị rồi tìm hàng chục của số bị trừ."},
      {"question_id":"g1-sub100-q17","correct_answer":"7","solution_steps":["Giữ nguyên 6 chục và tìm số cần bớt khỏi 9 đơn vị để còn 2 đơn vị.","Vì 69 − 7 = 62 nên số còn thiếu là 7."],"explanation":"Chín đơn vị bớt bảy đơn vị còn hai đơn vị.","hint":"Đếm lùi từ 9 đến 2."},
      {"question_id":"g1-sub100-q18","correct_answer":"48","solution_steps":["Tìm hàng đơn vị: 8 đơn vị bớt 5 đơn vị còn 3 đơn vị.","Tìm hàng chục: 4 chục bớt 1 chục còn 3 chục; vì 48 − 15 = 33 nên điền 48."],"explanation":"Số bị trừ gồm 4 chục và 8 đơn vị.","hint":"Tìm số có từng hàng phù hợp với hiệu đã cho."},

      {"question_id":"g1-sub100-q19","correct_answer":"B","solution_steps":["Lấy bớt 30 quả khỏi 80 quả nên dùng phép trừ 80 − 30.","Tám chục bớt ba chục còn năm chục: 80 − 30 = 50."],"explanation":"Trong giỏ còn lại 50 quả táo.","hint":"Bớt số quả đã lấy ra khỏi số quả ban đầu."},
      {"question_id":"g1-sub100-q20","correct_answer":"C","solution_steps":["Bớt số sách đã cho mượn khỏi số sách ban đầu bằng phép trừ 68 − 25.","Trừ đơn vị 8 − 5 = 3 và trừ chục 6 chục bớt 2 chục còn 4 chục, nên 68 − 25 = 43."],"explanation":"Trên giá còn lại 43 quyển sách.","hint":"Bớt số sách đã cho mượn khỏi 68."},
      {"question_id":"g1-sub100-q21","correct_answer":"B","solution_steps":["Số nhãn của Mai bớt đi nên dùng phép trừ 57 − 6.","Bớt 6 đơn vị khỏi 7 đơn vị còn 1 đơn vị, giữ nguyên 5 chục nên 57 − 6 = 51."],"explanation":"Mai còn lại 51 nhãn dán.","hint":"Giữ nguyên năm chục rồi bớt các đơn vị."},
      {"question_id":"g1-sub100-q22","correct_answer":"C","solution_steps":["Bớt số cây đã chuyển khỏi số cây ban đầu bằng phép trừ 95 − 34.","Trừ đơn vị 5 − 4 = 1 và trừ chục 9 chục bớt 3 chục còn 6 chục, nên 95 − 34 = 61."],"explanation":"Vườn còn lại 61 cây non.","hint":"Bớt số cây đã chuyển khỏi 95."},
      {"question_id":"g1-sub100-q23","correct_answer":"50","solution_steps":["Bớt 40 chiếc đã dùng khỏi 90 chiếc bằng phép trừ 90 − 40.","Chín chục bớt bốn chục còn năm chục: 90 − 40 = 50."],"explanation":"Hộp còn lại 50 bút chì.","hint":"Bớt số bút đã dùng khỏi số bút ban đầu."},
      {"question_id":"g1-sub100-q24","correct_answer":"72","solution_steps":["Bớt 7 khối đã cất khỏi 79 khối bằng phép trừ 79 − 7.","Chín đơn vị bớt bảy đơn vị còn hai đơn vị, giữ nguyên 7 chục nên 79 − 7 = 72."],"explanation":"Còn lại 72 khối gỗ.","hint":"Giữ nguyên bảy chục rồi bớt các đơn vị."}
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
  v_invalid_subtraction_count integer;
  v_start_definition text;
  v_submit_definition text;
  v_review_definition text;
  v_constraint_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-1-subtraction-within-100-no-borrow'
    and unit.grade = 1
    and unit.title = 'Phép trừ trong phạm vi 100 không mượn'
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 9
    and unit.prerequisite_unit_slug =
      'grade-1-addition-within-100-no-carry'
    and pg_catalog.jsonb_typeof(unit.lesson_content -> 'sections') = 'array'
    and pg_catalog.jsonb_array_length(unit.lesson_content -> 'sections') = 6
    and pg_catalog.jsonb_typeof(
      unit.lesson_content -> 'worked_examples'
    ) = 'array'
    and pg_catalog.jsonb_array_length(
      unit.lesson_content -> 'worked_examples'
    ) = 2;

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
  where question.unit_slug =
    'grade-1-subtraction-within-100-no-borrow';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug =
    'grade-1-subtraction-within-100-no-borrow';

  select count(*)
  into v_invalid_skill_count
  from (
    select question.skill_code, count(*) as question_total
    from public.questions as question
    where question.unit_slug =
      'grade-1-subtraction-within-100-no-borrow'
    group by question.skill_code
  ) as skill_group
  where
    skill_group.skill_code not in (
      'SUBTRACT_TENS_WITHIN_100',
      'SUBTRACT_TWO_DIGIT_NO_BORROW',
      'MISSING_NUMBER_SUBTRACTION_100',
      'SUBTRACTION_WORD_PROBLEM_100'
    )
    or skill_group.question_total <> 6;

  select count(*) - count(distinct question.code)
  into v_duplicate_code_count
  from public.questions as question
  where question.unit_slug =
    'grade-1-subtraction-within-100-no-borrow';

  select count(*) - count(distinct question.prompt)
  into v_duplicate_prompt_count
  from public.questions as question
  where question.unit_slug =
    'grade-1-subtraction-within-100-no-borrow';

  select count(*)
  into v_invalid_mcq_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug =
      'grade-1-subtraction-within-100-no-borrow'
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
    question.unit_slug =
      'grade-1-subtraction-within-100-no-borrow'
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
    question.unit_slug =
      'grade-1-subtraction-within-100-no-borrow'
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
  into v_invalid_subtraction_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug =
      'grade-1-subtraction-within-100-no-borrow'
    and (
      not exists (
        select 1
        from pg_catalog.regexp_matches(
          solution.solution_steps::text || ' ' || solution.explanation,
          '([0-9]{1,3})[[:space:]]*[-−][[:space:]]*([0-9]{1,3})[[:space:]]*=[[:space:]]*([0-9]{1,3})',
          'g'
        ) as subtraction_fact(parts)
      )
      or exists (
        select 1
        from pg_catalog.regexp_matches(
          solution.solution_steps::text || ' ' || solution.explanation,
          '([0-9]{1,3})[[:space:]]*[-−][[:space:]]*([0-9]{1,3})[[:space:]]*=[[:space:]]*([0-9]{1,3})',
          'g'
        ) as subtraction_fact(parts)
        where
          subtraction_fact.parts[1]::integer
            - subtraction_fact.parts[2]::integer
              <> subtraction_fact.parts[3]::integer
          or subtraction_fact.parts[1]::integer
            < subtraction_fact.parts[2]::integer
          or subtraction_fact.parts[1]::integer > 100
          or subtraction_fact.parts[2]::integer > 100
          or subtraction_fact.parts[3]::integer > 100
          or (
            subtraction_fact.parts[1]::integer % 10
              < subtraction_fact.parts[2]::integer % 10
          )
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
    or v_invalid_subtraction_count <> 0
  then
    raise exception 'Grade 1 subtraction-to-100 content validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as prerequisite
    join public.learning_units as current_unit
      on current_unit.prerequisite_unit_slug = prerequisite.slug
    where
      prerequisite.slug = 'grade-1-addition-within-100-no-carry'
      and prerequisite.display_order = 8
      and current_unit.slug =
        'grade-1-subtraction-within-100-no-borrow'
      and current_unit.display_order = 9
  ) then
    raise exception 'Grade 1 subtraction-to-100 prerequisite validation failed';
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
    or v_constraint_definition !~ 'SUBTRACT_TENS_WITHIN_100'
    or v_constraint_definition !~ 'SUBTRACT_TWO_DIGIT_NO_BORROW'
    or v_constraint_definition !~ 'MISSING_NUMBER_SUBTRACTION_100'
    or v_constraint_definition !~ 'SUBTRACTION_WORD_PROBLEM_100'
  then
    raise exception 'Grade 1 subtraction-to-100 skill constraint validation failed';
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
