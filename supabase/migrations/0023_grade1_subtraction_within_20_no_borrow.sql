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
    'SUBTRACTION_WORD_PROBLEM'
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
  'grade-1-subtraction-within-20-no-borrow',
  1,
  'Phép trừ trong phạm vi 20 không mượn',
  'Trừ các số đến 20 bằng cách giữ nguyên chục và bớt các đơn vị.',
  $objectives$[
    "Hiểu phép trừ là bớt đi, tìm số còn lại hoặc tìm phần chênh lệch.",
    "Trừ được số có một hoặc hai chữ số trong phạm vi 20 mà không mượn.",
    "Tìm được số còn thiếu trong phép trừ đơn giản.",
    "Dùng phép cộng để kiểm tra kết quả phép trừ khi phù hợp.",
    "Giải được bài toán trừ có lời văn một bước trong phạm vi 20."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "subtract-means-take-away",
        "title": "Phép trừ là bớt đi",
        "paragraphs": [
          "Khi một nhóm có vài đồ vật được lấy bớt, ta dùng phép trừ để tìm số còn lại.",
          "Ví dụ: có 17 que tính, bớt 5 que thì viết 17 − 5."
        ]
      },
      {
        "code": "find-what-remains-or-difference",
        "title": "Tìm số còn lại và phần chênh lệch",
        "paragraphs": [
          "Phép trừ giúp tìm số đồ vật còn lại sau khi bớt đi.",
          "Phép trừ cũng giúp tìm hai nhóm hơn kém nhau bao nhiêu ở những tình huống đơn giản."
        ]
      },
      {
        "code": "tens-and-ones-no-borrow",
        "title": "Nhìn chục và đơn vị",
        "paragraphs": [
          "Số 17 gồm 1 chục và 7 đơn vị. Khi trừ 5, ta bớt 5 trong 7 đơn vị.",
          "Vì 7 đủ để bớt 5 nên không cần đổi một chục thành các đơn vị."
        ]
      },
      {
        "code": "subtract-ones-or-ten",
        "title": "Bớt các đơn vị hoặc bớt một chục",
        "paragraphs": [
          "Với 18 − 8, giữ nguyên một chục và bớt hết 8 đơn vị, còn số 10.",
          "Với 16 − 10, bớt một chục và giữ 6 đơn vị, còn số 6."
        ]
      },
      {
        "code": "check-subtraction-with-addition",
        "title": "Kiểm tra lại bằng phép cộng",
        "paragraphs": [
          "Sau khi tính 17 − 5 = 12, ta có thể kiểm tra bằng phép cộng 12 + 5 = 17.",
          "Nếu tổng trở lại đúng số ban đầu thì kết quả phép trừ phù hợp."
        ]
      },
      {
        "code": "one-step-subtraction-story-to-20",
        "title": "Bài toán có lời văn một bước",
        "paragraphs": [
          "Đọc xem ban đầu có bao nhiêu và đã bớt đi bao nhiêu, hoặc hai nhóm chênh nhau bao nhiêu.",
          "Viết một phép trừ, tính kết quả rồi trả lời bằng một câu đầy đủ."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Tính 17 − 5",
        "steps": [
          "Tách 17 thành 1 chục và 7 đơn vị.",
          "Bớt ở hàng đơn vị: 7 − 5 = 2.",
          "Giữ nguyên một chục.",
          "Một chục và 2 đơn vị tạo thành số 12.",
          "Kiểm tra: 12 + 5 = 17."
        ],
        "answer": "17 − 5 = 12."
      },
      {
        "title": "Bài toán về những chiếc bút",
        "steps": [
          "Hộp có 18 chiếc bút và lấy ra 6 chiếc nên ta dùng phép trừ.",
          "Tách 18 thành 1 chục và 8 đơn vị.",
          "Bớt ở hàng đơn vị: 8 − 6 = 2.",
          "Giữ nguyên một chục, ta được số 12.",
          "Trả lời câu hỏi bằng một câu đầy đủ."
        ],
        "answer": "Trong hộp còn lại 12 chiếc bút."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  6,
  'grade-1-addition-within-20-no-carry'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-sub20-q01","question_type":"MULTIPLE_CHOICE","prompt":"Có 17 quả táo, cho bạn 5 quả. Phép tính nào phù hợp để tìm số táo còn lại?","options":{"A":"17 − 5","B":"17 − 4","C":"15 − 5","D":"17 − 7"},"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":1},
      {"code":"g1-sub20-q02","question_type":"MULTIPLE_CHOICE","prompt":"Trên cành có 18 con chim, 8 con bay đi. Chọn phép tính tìm số chim còn lại.","options":{"A":"18 − 7","B":"17 − 7","C":"18 − 8","D":"18 − 0"},"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":2},
      {"code":"g1-sub20-q03","question_type":"MULTIPLE_CHOICE","prompt":"Nhóm thứ nhất có 16 khối, nhóm thứ hai có 4 khối. Phép tính nào tìm phần chênh lệch?","options":{"A":"16 − 3","B":"16 − 4","C":"14 − 4","D":"16 − 6"},"skill_code":"SUBTRACTION_MEANING","difficulty":"MEDIUM","display_order":3},
      {"code":"g1-sub20-q04","question_type":"MULTIPLE_CHOICE","prompt":"Tình huống nào phù hợp với phép tính 19 − 6?","options":{"A":"Có 19 bút, cho đi 6 bút","B":"Có 19 bút, cho đi 5 bút","C":"Có 18 bút, cho đi 6 bút","D":"Có 19 bút, cho đi 9 bút"},"skill_code":"SUBTRACTION_MEANING","difficulty":"MEDIUM","display_order":4},
      {"code":"g1-sub20-q05","question_type":"NUMBER_INPUT","prompt":"Có 15 viên bi, cất đi 5 viên. Còn lại bao nhiêu viên bi?","options":null,"skill_code":"SUBTRACTION_MEANING","difficulty":"EASY","display_order":5},
      {"code":"g1-sub20-q06","question_type":"NUMBER_INPUT","prompt":"Nhóm đỏ có 18 thẻ, nhóm xanh có 6 thẻ. Nhóm đỏ nhiều hơn nhóm xanh bao nhiêu thẻ?","options":null,"skill_code":"SUBTRACTION_MEANING","difficulty":"MEDIUM","display_order":6},

      {"code":"g1-sub20-q07","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 17 − 5 là số nào?","options":{"A":"10","B":"11","C":"12","D":"13"},"skill_code":"SUBTRACTION_WITHIN_20_NO_BORROW","difficulty":"EASY","display_order":7},
      {"code":"g1-sub20-q08","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 18 − 8 là số nào?","options":{"A":"8","B":"9","C":"10","D":"11"},"skill_code":"SUBTRACTION_WITHIN_20_NO_BORROW","difficulty":"EASY","display_order":8},
      {"code":"g1-sub20-q09","question_type":"MULTIPLE_CHOICE","prompt":"Kết quả của phép tính 16 − 10 là số nào?","options":{"A":"5","B":"6","C":"10","D":"16"},"skill_code":"SUBTRACTION_WITHIN_20_NO_BORROW","difficulty":"EASY","display_order":9},
      {"code":"g1-sub20-q10","question_type":"MULTIPLE_CHOICE","prompt":"Phép trừ 20 − 10 có kết quả bằng bao nhiêu?","options":{"A":"0","B":"9","C":"10","D":"20"},"skill_code":"SUBTRACTION_WITHIN_20_NO_BORROW","difficulty":"MEDIUM","display_order":10},
      {"code":"g1-sub20-q11","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của phép trừ 14 − 4.","options":null,"skill_code":"SUBTRACTION_WITHIN_20_NO_BORROW","difficulty":"EASY","display_order":11},
      {"code":"g1-sub20-q12","question_type":"NUMBER_INPUT","prompt":"Tính rồi nhập kết quả của phép trừ 19 − 6.","options":null,"skill_code":"SUBTRACTION_WITHIN_20_NO_BORROW","difficulty":"MEDIUM","display_order":12},

      {"code":"g1-sub20-q13","question_type":"MULTIPLE_CHOICE","prompt":"Điền số thích hợp vào ô trống: 17 − □ = 12.","options":{"A":"3","B":"4","C":"5","D":"7"},"skill_code":"MISSING_NUMBER_SUBTRACTION","difficulty":"EASY","display_order":13},
      {"code":"g1-sub20-q14","question_type":"MULTIPLE_CHOICE","prompt":"Số nào thích hợp trong phép tính □ − 4 = 13?","options":{"A":"14","B":"16","C":"17","D":"19"},"skill_code":"MISSING_NUMBER_SUBTRACTION","difficulty":"MEDIUM","display_order":14},
      {"code":"g1-sub20-q15","question_type":"MULTIPLE_CHOICE","prompt":"Điền số còn thiếu để phép tính đúng: 18 − □ = 10.","options":{"A":"6","B":"7","C":"8","D":"9"},"skill_code":"MISSING_NUMBER_SUBTRACTION","difficulty":"EASY","display_order":15},
      {"code":"g1-sub20-q16","question_type":"MULTIPLE_CHOICE","prompt":"Số nào cần điền vào ô trống: 15 − 3 = □?","options":{"A":"10","B":"11","C":"12","D":"13"},"skill_code":"MISSING_NUMBER_SUBTRACTION","difficulty":"EASY","display_order":16},
      {"code":"g1-sub20-q17","question_type":"NUMBER_INPUT","prompt":"Nhập số còn thiếu để phép tính đúng: 19 − □ = 14.","options":null,"skill_code":"MISSING_NUMBER_SUBTRACTION","difficulty":"MEDIUM","display_order":17},
      {"code":"g1-sub20-q18","question_type":"NUMBER_INPUT","prompt":"Nhập số thích hợp vào ô trống: □ − 6 = 12.","options":null,"skill_code":"MISSING_NUMBER_SUBTRACTION","difficulty":"MEDIUM","display_order":18},

      {"code":"g1-sub20-q19","question_type":"MULTIPLE_CHOICE","prompt":"Lan có 18 nhãn dán, cho bạn 5 nhãn. Lan còn lại bao nhiêu nhãn dán?","options":{"A":"11 nhãn","B":"12 nhãn","C":"13 nhãn","D":"14 nhãn"},"skill_code":"SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":19},
      {"code":"g1-sub20-q20","question_type":"MULTIPLE_CHOICE","prompt":"Trên cây có 17 con chim, 7 con bay đi. Còn lại bao nhiêu con chim?","options":{"A":"9 con","B":"10 con","C":"11 con","D":"17 con"},"skill_code":"SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":20},
      {"code":"g1-sub20-q21","question_type":"MULTIPLE_CHOICE","prompt":"Hộp có 20 bút chì, Mai lấy 10 bút để vẽ. Trong hộp còn bao nhiêu bút chì?","options":{"A":"0 bút","B":"9 bút","C":"10 bút","D":"20 bút"},"skill_code":"SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":21},
      {"code":"g1-sub20-q22","question_type":"MULTIPLE_CHOICE","prompt":"Có 16 khối màu xanh và 4 khối màu vàng. Số khối xanh nhiều hơn số khối vàng bao nhiêu?","options":{"A":"10 khối","B":"11 khối","C":"12 khối","D":"13 khối"},"skill_code":"SUBTRACTION_WORD_PROBLEM","difficulty":"MEDIUM","display_order":22},
      {"code":"g1-sub20-q23","question_type":"NUMBER_INPUT","prompt":"Kệ có 19 quyển sách, cho mượn 6 quyển. Kệ còn lại bao nhiêu quyển sách?","options":null,"skill_code":"SUBTRACTION_WORD_PROBLEM","difficulty":"EASY","display_order":23},
      {"code":"g1-sub20-q24","question_type":"NUMBER_INPUT","prompt":"Có 15 chiếc bánh, ăn 5 chiếc. Còn lại bao nhiêu chiếc bánh?","options":null,"skill_code":"SUBTRACTION_WORD_PROBLEM","difficulty":"MEDIUM","display_order":24}
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
  'grade-1-subtraction-within-20-no-borrow',
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
      {"question_id":"g1-sub20-q01","correct_answer":"A","solution_steps":["Ban đầu có 17 quả táo và cho đi 5 quả.","Tình huống bớt đi được viết là 17 − 5."],"explanation":"Phép trừ 17 − 5 biểu diễn đúng việc có mười bảy rồi cho đi năm.","hint":"Tìm số táo ban đầu và số táo đã cho bạn."},
      {"question_id":"g1-sub20-q02","correct_answer":"C","solution_steps":["Trên cành có 18 con chim và 8 con bay đi.","Muốn tìm số còn lại, viết phép trừ 18 − 8."],"explanation":"Dấu trừ dùng khi tám con chim rời khỏi nhóm mười tám con.","hint":"Số chim ban đầu đứng trước dấu trừ."},
      {"question_id":"g1-sub20-q03","correct_answer":"B","solution_steps":["Nhóm thứ nhất có 16 khối và nhóm thứ hai có 4 khối.","Lấy số lớn trừ số nhỏ để tìm chênh lệch: 16 − 4."],"explanation":"Phép trừ 16 − 4 cho biết nhóm thứ nhất nhiều hơn nhóm thứ hai bao nhiêu.","hint":"Để tìm phần hơn, lấy mười sáu bớt bốn."},
      {"question_id":"g1-sub20-q04","correct_answer":"A","solution_steps":["Phép tính 19 − 6 bắt đầu với 19 đồ vật.","Tình huống cần bớt đúng 6 đồ vật, nên chọn có 19 bút rồi cho đi 6 bút."],"explanation":"Cho đi sáu chiếc từ nhóm mười chín chiếc phù hợp với phép trừ đã cho.","hint":"So khớp cả số ban đầu và số được bớt đi."},
      {"question_id":"g1-sub20-q05","correct_answer":"10","solution_steps":["Có 15 viên bi và cất đi 5 viên.","Tính 15 − 5 = 10, vậy còn lại 10 viên bi."],"explanation":"Mười lăm bớt năm còn mười.","hint":"Giữ một chục rồi bớt hết năm đơn vị."},
      {"question_id":"g1-sub20-q06","correct_answer":"12","solution_steps":["Nhóm đỏ có 18 thẻ và nhóm xanh có 6 thẻ.","Tính phần chênh lệch: 18 − 6 = 12."],"explanation":"Nhóm đỏ nhiều hơn nhóm xanh mười hai thẻ.","hint":"Lấy số thẻ của nhóm lớn trừ số thẻ của nhóm nhỏ."},

      {"question_id":"g1-sub20-q07","correct_answer":"C","solution_steps":["Tách 17 thành 1 chục và 7 đơn vị.","Bớt 5 đơn vị khỏi 7 đơn vị còn 2 đơn vị, nên kết quả là 12."],"explanation":"Một chục và hai đơn vị tạo thành số 12.","hint":"Giữ một chục rồi tính 7 − 5."},
      {"question_id":"g1-sub20-q08","correct_answer":"C","solution_steps":["Số 18 gồm 1 chục và 8 đơn vị.","Bớt hết 8 đơn vị, còn nguyên 1 chục là số 10."],"explanation":"Mười tám bớt tám còn mười.","hint":"Giữ một chục và bớt tám đơn vị."},
      {"question_id":"g1-sub20-q09","correct_answer":"B","solution_steps":["Số 16 gồm 1 chục và 6 đơn vị.","Bớt một chục khỏi 16 thì còn 6 đơn vị."],"explanation":"Mười sáu bớt mười còn sáu.","hint":"Bớt phần một chục và giữ lại sáu đơn vị."},
      {"question_id":"g1-sub20-q10","correct_answer":"C","solution_steps":["Số 20 gồm 2 chục.","Bớt 1 chục khỏi 2 chục thì còn 1 chục, tức số 10."],"explanation":"Hai mươi bớt mười còn mười.","hint":"Nghĩ hai chục bớt một chục."},
      {"question_id":"g1-sub20-q11","correct_answer":"10","solution_steps":["Số 14 gồm 1 chục và 4 đơn vị.","Bớt hết 4 đơn vị, còn nguyên 1 chục nên 14 − 4 = 10."],"explanation":"Mười bốn bớt bốn còn mười.","hint":"Giữ một chục và bớt bốn đơn vị."},
      {"question_id":"g1-sub20-q12","correct_answer":"13","solution_steps":["Số 19 gồm 1 chục và 9 đơn vị.","Tính 9 − 6 = 3 rồi giữ một chục, nên kết quả là 13."],"explanation":"Mười chín bớt sáu còn mười ba.","hint":"Giữ một chục rồi tính chín bớt sáu."},

      {"question_id":"g1-sub20-q13","correct_answer":"C","solution_steps":["Muốn tìm số bị bớt, lấy 17 − 12.","Ta được 5 và kiểm tra 17 − 5 = 12."],"explanation":"Số 5 điền vào ô trống làm phép tính đúng.","hint":"Tìm số cộng với mười hai để trở lại mười bảy."},
      {"question_id":"g1-sub20-q14","correct_answer":"C","solution_steps":["Số cần tìm bớt 4 thì còn 13.","Lấy 13 + 4 = 17 và kiểm tra 17 − 4 = 13."],"explanation":"Số 17 là số bị trừ phù hợp.","hint":"Lấy kết quả cộng lại với số bốn."},
      {"question_id":"g1-sub20-q15","correct_answer":"C","solution_steps":["Muốn tìm số bị bớt, lấy 18 − 10.","Ta được 8 và kiểm tra 18 − 8 = 10."],"explanation":"Số 8 điền vào ô trống làm phép tính đúng.","hint":"Tìm phần còn thiếu bên cạnh số mười để tạo thành mười tám."},
      {"question_id":"g1-sub20-q16","correct_answer":"C","solution_steps":["Tách 15 thành 1 chục và 5 đơn vị.","Tính 5 − 3 = 2 rồi giữ một chục, nên 15 − 3 = 12."],"explanation":"Số 12 là kết quả cần điền vào ô trống.","hint":"Giữ một chục rồi bớt ba trong năm đơn vị."},
      {"question_id":"g1-sub20-q17","correct_answer":"5","solution_steps":["Muốn tìm số bị bớt, lấy 19 − 14.","Ta được 5 và kiểm tra 19 − 5 = 14."],"explanation":"Số còn thiếu trong phép trừ là 5.","hint":"Tìm số cộng với mười bốn để được mười chín."},
      {"question_id":"g1-sub20-q18","correct_answer":"18","solution_steps":["Số cần tìm bớt 6 thì còn 12.","Lấy 12 + 6 = 18 và kiểm tra 18 − 6 = 12."],"explanation":"Số bị trừ cần điền là 18.","hint":"Cộng kết quả mười hai với số sáu."},

      {"question_id":"g1-sub20-q19","correct_answer":"C","solution_steps":["Lan có 18 nhãn dán và cho bạn 5 nhãn nên dùng phép trừ.","Tính 18 − 5 = 13, vậy Lan còn 13 nhãn dán."],"explanation":"Mười tám bớt năm còn mười ba.","hint":"Giữ một chục rồi bớt năm trong tám đơn vị."},
      {"question_id":"g1-sub20-q20","correct_answer":"B","solution_steps":["Trên cây có 17 con chim và 7 con bay đi.","Tính 17 − 7 = 10, vậy còn lại 10 con chim."],"explanation":"Mười bảy bớt bảy còn mười.","hint":"Bớt hết bảy đơn vị và giữ một chục."},
      {"question_id":"g1-sub20-q21","correct_answer":"C","solution_steps":["Hộp có 20 bút và Mai lấy 10 bút.","Tính 20 − 10 = 10, vậy trong hộp còn 10 bút."],"explanation":"Hai chục bớt một chục còn một chục.","hint":"Nghĩ hai chục bớt một chục."},
      {"question_id":"g1-sub20-q22","correct_answer":"C","solution_steps":["Có 16 khối xanh và 4 khối vàng.","Tính chênh lệch 16 − 4 = 12, nên khối xanh nhiều hơn 12 khối."],"explanation":"Mười sáu hơn bốn đúng mười hai đơn vị.","hint":"Lấy số khối xanh trừ số khối vàng."},
      {"question_id":"g1-sub20-q23","correct_answer":"13","solution_steps":["Kệ có 19 quyển sách và cho mượn 6 quyển.","Tính 19 − 6 = 13, vậy kệ còn 13 quyển sách."],"explanation":"Mười chín bớt sáu còn mười ba.","hint":"Giữ một chục rồi tính chín bớt sáu."},
      {"question_id":"g1-sub20-q24","correct_answer":"10","solution_steps":["Có 15 chiếc bánh và ăn 5 chiếc.","Tính 15 − 5 = 10, vậy còn lại 10 chiếc bánh."],"explanation":"Mười lăm bớt năm còn mười.","hint":"Bớt hết năm đơn vị và giữ một chục."}
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

-- Keep the shared NUMBER_INPUT boundary aligned with all currently
-- published Grade 1 units: valid responses are non-negative integers 0..20.
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
      v_normalized_answer !~ '^[0-9]{1,6}$'
      or v_normalized_answer::integer not between 0 and 20
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
  v_skill_group_count integer := 0;
  v_start_definition text;
  v_submit_definition text;
  v_review_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-1-subtraction-within-20-no-borrow'
    and unit.grade = 1
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 6
    and unit.prerequisite_unit_slug =
      'grade-1-addition-within-20-no-carry'
    and jsonb_typeof(unit.learning_objectives) = 'array'
    and jsonb_array_length(unit.learning_objectives) >= 5
    and jsonb_typeof(unit.lesson_content -> 'sections') = 'array'
    and jsonb_array_length(unit.lesson_content -> 'sections') >= 6
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
  where question.unit_slug =
    'grade-1-subtraction-within-20-no-borrow';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug =
    'grade-1-subtraction-within-20-no-borrow';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_skill_group_count <> 4
  then
    raise exception 'Grade 1 subtraction to 20 seed count validation failed';
  end if;

  if exists (
    select 1
    from (
      select
        question.skill_code,
        count(*) as question_count
      from public.questions as question
      where question.unit_slug =
        'grade-1-subtraction-within-20-no-borrow'
      group by question.skill_code
    ) as skill
    where skill.question_count <> 6
  ) then
    raise exception 'Grade 1 subtraction to 20 skill validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    where
      question.unit_slug =
        'grade-1-subtraction-within-20-no-borrow'
      and question.skill_code not in (
        'SUBTRACTION_MEANING',
        'SUBTRACTION_WITHIN_20_NO_BORROW',
        'MISSING_NUMBER_SUBTRACTION',
        'SUBTRACTION_WORD_PROBLEM'
      )
  ) then
    raise exception 'Grade 1 subtraction to 20 unexpected skill validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    join public.question_solutions as solution
      on solution.question_id = question.code
    where
      question.unit_slug =
        'grade-1-subtraction-within-20-no-borrow'
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
            or solution.correct_answer !~ '^[A-D]$'
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
    raise exception 'Grade 1 subtraction to 20 content validation failed';
  end if;

  if
    (
      select count(distinct question.code)
      from public.questions as question
      where question.unit_slug =
        'grade-1-subtraction-within-20-no-borrow'
    ) <> 24
    or (
      select count(distinct question.prompt)
      from public.questions as question
      where question.unit_slug =
        'grade-1-subtraction-within-20-no-borrow'
    ) <> 24
  then
    raise exception 'Grade 1 subtraction to 20 duplicate validation failed';
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
        'grade-1-subtraction-within-20-no-borrow'
    ) as content
    where content.content_text
      ~ '(^|[^0-9])(2[1-9]|[3-9][0-9]|[1-9][0-9]{2,})([^0-9]|$)'
      or content.content_text
        ~ '[0-9][[:space:]]*[×÷*/][[:space:]]*[0-9]'
  ) then
    raise exception 'Grade 1 subtraction to 20 range validation failed';
  end if;

  if exists (
    select 1
    from public.questions as question
    where
      question.unit_slug =
        'grade-1-subtraction-within-20-no-borrow'
      and question.prompt
        ~* '(sau đó|tiếp theo).*(bớt|lấy|cho|ăn|bay|mượn)'
  ) then
    raise exception 'Grade 1 subtraction to 20 two-step validation failed';
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
        'grade-1-subtraction-within-20-no-borrow'
    ) as content
    cross join lateral pg_catalog.regexp_matches(
      content.content_text,
      '([0-9]+)[[:space:]]*[−-][[:space:]]*([0-9]+)',
      'g'
    ) as expression(parts)
    where
      (expression.parts)[1]::integer > 20
      or (expression.parts)[2]::integer > 20
      or (expression.parts)[2]::integer
        > (expression.parts)[1]::integer
      or mod((expression.parts)[1]::integer, 10)
        < mod((expression.parts)[2]::integer, 10)
  ) then
    raise exception 'Grade 1 subtraction to 20 no-borrow validation failed';
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
      on addition_to_20.prerequisite_unit_slug =
        numbers_to_20.slug
    join public.learning_units as subtraction_to_20
      on subtraction_to_20.prerequisite_unit_slug =
        addition_to_20.slug
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
      and subtraction_to_20.slug =
        'grade-1-subtraction-within-20-no-borrow'
      and subtraction_to_20.display_order = 6
  ) then
    raise exception 'Grade 1 prerequisite chain validation failed';
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
    or v_submit_definition !~ 'not between 0 and 20'
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
    raise exception 'Practice answer boundary validation failed';
  end if;
end;
$validation$;

commit;
