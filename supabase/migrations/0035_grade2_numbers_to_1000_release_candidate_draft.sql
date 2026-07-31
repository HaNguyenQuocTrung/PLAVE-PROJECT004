begin;

-- RELEASE CANDIDATE ONLY. Owner review is required before this file may be
-- applied. Applying it stages DRAFT/HIDDEN content; it does not publish or
-- enable Student visibility.
-- Release candidate: g2-numbers-to-1000-rc1
-- Content version: g2n1000-1.0.0-rc.1
-- Frozen seed: g2-review-number-language
-- Frozen bundle SHA-256:
-- 1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530

do $$
begin
  if exists (
    select 1
    from public.learning_units
    where slug = 'grade-2-numbers-to-1000'
  ) then
    raise exception
      'Grade 2 numbers release candidate already exists; refusing to overwrite';
  end if;
end;
$$;

create or replace function private.is_valid_grade2_number_visual_spec(
  p_spec jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_kind text;
  v_start integer;
  v_end integer;
  v_focus integer;
  v_thousands integer;
  v_hundreds integer;
  v_tens integer;
  v_ones integer;
begin
  if
    pg_catalog.jsonb_typeof(p_spec) <> 'object'
    or pg_catalog.jsonb_typeof(p_spec -> 'kind') <> 'string'
    or pg_catalog.jsonb_typeof(p_spec -> 'description') <> 'string'
    or char_length(btrim(p_spec ->> 'description')) not between 12 and 240
    or btrim(p_spec ->> 'description') <> p_spec ->> 'description'
    or lower(p_spec ->> 'description')
      ~ '(https?:|www[.]|javascript:|data:|<|>|đáp án|đúng là|sai là)'
  then
    return false;
  end if;

  v_kind := p_spec ->> 'kind';

  if v_kind = 'NUMBER_CARD' then
    return
      (select count(*) from pg_catalog.jsonb_object_keys(p_spec)) = 3
      and pg_catalog.jsonb_typeof(p_spec -> 'value') = 'number'
      and p_spec ->> 'value' ~ '^[0-9]+$'
      and (p_spec ->> 'value')::integer between 0 and 1000;
  end if;

  if v_kind = 'PLACE_VALUE_CHART' then
    if
      (select count(*) from pg_catalog.jsonb_object_keys(p_spec)) <> 6
      or not (
        p_spec ?& array[
          'kind',
          'description',
          'thousands',
          'hundreds',
          'tens',
          'ones'
        ]
      )
      or pg_catalog.jsonb_typeof(p_spec -> 'thousands') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'hundreds') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'tens') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'ones') <> 'number'
      or p_spec ->> 'thousands' !~ '^[0-9]+$'
      or p_spec ->> 'hundreds' !~ '^[0-9]+$'
      or p_spec ->> 'tens' !~ '^[0-9]+$'
      or p_spec ->> 'ones' !~ '^[0-9]+$'
    then
      return false;
    end if;

    v_thousands := (p_spec ->> 'thousands')::integer;
    v_hundreds := (p_spec ->> 'hundreds')::integer;
    v_tens := (p_spec ->> 'tens')::integer;
    v_ones := (p_spec ->> 'ones')::integer;
    return
      v_thousands between 0 and 1
      and v_hundreds between 0 and 9
      and v_tens between 0 and 9
      and v_ones between 0 and 9
      and (
        v_thousands * 1000
        + v_hundreds * 100
        + v_tens * 10
        + v_ones
      ) between 0 and 1000;
  end if;

  if v_kind = 'NUMBER_LINE' then
    if
      (select count(*) from pg_catalog.jsonb_object_keys(p_spec)) <> 5
      or not (
        p_spec ?& array[
          'kind',
          'description',
          'start',
          'end',
          'focusValue'
        ]
      )
      or pg_catalog.jsonb_typeof(p_spec -> 'start') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'end') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'focusValue') <> 'number'
      or p_spec ->> 'start' !~ '^[0-9]+$'
      or p_spec ->> 'end' !~ '^[0-9]+$'
      or p_spec ->> 'focusValue' !~ '^[0-9]+$'
    then
      return false;
    end if;

    v_start := (p_spec ->> 'start')::integer;
    v_end := (p_spec ->> 'end')::integer;
    v_focus := (p_spec ->> 'focusValue')::integer;
    return
      v_start between 0 and 1000
      and v_end between 0 and 1000
      and v_start < v_end
      and v_end - v_start <= 10
      and v_focus between v_start and v_end;
  end if;

  return false;
exception
  when others then
    return false;
end;
$$;

revoke all
on function private.is_valid_grade2_number_visual_spec(jsonb)
from public, anon, authenticated;

alter table public.questions
drop constraint if exists questions_visual_spec_check;

alter table public.questions
add constraint questions_visual_spec_check
check (
  visual_spec is null
  or private.is_valid_practice_visual_spec(visual_spec)
  or private.is_valid_time_visual_spec(visual_spec)
  or private.is_valid_solid_visual_spec(visual_spec)
  or private.is_valid_grade2_number_visual_spec(visual_spec)
);

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
    'SUBTRACTION_WORD_PROBLEM_100',
    'RECOGNIZE_BASIC_SHAPES',
    'COMPARE_AND_SORT_SHAPES',
    'POSITION_RELATIONS',
    'COUNT_SHAPES_IN_PICTURE',
    'COMPARE_LENGTHS',
    'ORDER_BY_LENGTH',
    'MEASURE_WITH_EQUAL_UNITS',
    'READ_SIMPLE_MEASUREMENT',
    'READ_WHOLE_HOURS',
    'ORDER_DAILY_EVENTS',
    'DAYS_OF_WEEK',
    'READ_SIMPLE_CALENDAR',
    'CUBE_RECOGNITION',
    'CUBOID_RECOGNITION',
    'REAL_OBJECT_CLASSIFICATION',
    'SIMPLE_BLOCK_COMPOSITION',
    'NUMBER_RECOGNITION_TO_1000',
    'READ_WRITE_TO_1000',
    'PLACE_VALUE_TO_1000',
    'SEQUENCE_TO_1000'
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
  'grade-2-numbers-to-1000',
  2,
  'Các số trong phạm vi 1000',
  'Đếm, đọc, viết và nhận biết cấu tạo hàng của các số từ 0 đến 1000.',
  $objectives$[
    "Đếm, nhận biết và viết được số trong phạm vi 1000.",
    "Đọc số theo house style tiếng Việt nhất quán của PLAVE.",
    "Xác định chữ số hàng trăm, hàng chục và hàng đơn vị.",
    "Tìm số liền trước, số liền sau trên tia số đơn giản."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "count-to-1000",
        "title": "Các số đến 1000",
        "paragraphs": [
          "Ta có thể đếm tiếp từ các số đã biết để gặp những số lớn hơn 100.",
          "Số 1000 được viết bằng chữ số 1 và ba chữ số 0."
        ]
      },
      {
        "code": "read-and-write",
        "title": "Đọc và viết số",
        "paragraphs": [
          "Khi đọc số có ba chữ số, ta đọc hàng trăm trước, rồi đến hàng chục và hàng đơn vị.",
          "Khi hàng chục bằng 0 nhưng hàng đơn vị khác 0, PLAVE dùng từ “linh”, như 305 đọc là ba trăm linh năm."
        ]
      },
      {
        "code": "place-value",
        "title": "Hàng trăm, hàng chục và hàng đơn vị",
        "paragraphs": [
          "Mỗi chữ số có giá trị theo vị trí của nó trong số.",
          "Trong số 472, chữ số 4 ở hàng trăm, 7 ở hàng chục và 2 ở hàng đơn vị."
        ]
      },
      {
        "code": "compose-number",
        "title": "Ghép số từ các hàng",
        "paragraphs": [
          "Ta đặt chữ số hàng trăm, hàng chục và hàng đơn vị vào đúng cột.",
          "Năm trăm, hai chục và sáu đơn vị ghép thành số 526."
        ]
      },
      {
        "code": "zero-place",
        "title": "Chữ số 0 giữ vị trí",
        "paragraphs": [
          "Chữ số 0 cho biết hàng đó không có nhóm nào, nhưng vẫn giữ đúng vị trí của các chữ số khác.",
          "Số 704 có 7 trăm, 0 chục và 4 đơn vị."
        ]
      },
      {
        "code": "number-neighbors",
        "title": "Số liền trước và số liền sau",
        "paragraphs": [
          "Số liền trước kém số đã cho 1 đơn vị; số liền sau hơn số đã cho 1 đơn vị.",
          "Trên tia số tăng dần, số liền trước ở ngay bên trái và số liền sau ở ngay bên phải."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Ghép số theo hàng",
        "steps": [
          "Đặt 6 vào hàng trăm, 0 vào hàng chục và 8 vào hàng đơn vị.",
          "Ghép ba chữ số theo đúng thứ tự để được 608.",
          "Đọc số là sáu trăm linh tám."
        ],
        "answer": "Số cần tìm là 608."
      },
      {
        "title": "Tìm hai số đứng cạnh",
        "steps": [
          "Số liền trước của 350 kém 350 một đơn vị nên là 349.",
          "Số liền sau của 350 hơn 350 một đơn vị nên là 351.",
          "Kiểm tra thứ tự trên tia số: 349, 350, 351."
        ],
        "answer": "Số liền trước là 349; số liền sau là 351."
      }
    ],
    "memory_note": "Đọc và ghép số từ hàng cao xuống hàng thấp; luôn giữ đúng vị trí của chữ số 0."
  }$lesson$::jsonb,
  24,
  false,
  1,
  null
);

do $seed$
declare
  v_release_bank jsonb :=
  $release_bank$[
    {
      "code": "g2-num1000-1nighc4-01",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Số gồm 2 trăm, 1 chục và 2 đơn vị là số nào?",
      "options": {"A": "214", "B": "112", "C": "232", "D": "212"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 2, "tens": 1, "ones": 2, "description": "Bảng giá trị hàng biểu diễn 2 trăm, 1 chục và 2 đơn vị."},
      "skill_code": "NUMBER_RECOGNITION_TO_1000",
      "difficulty": "EASY",
      "display_order": 1,
      "correct_answer": "D",
      "solution_steps": ["Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.", "Ghép các chữ số đúng vị trí để được số 212."],
      "explanation": "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng. Ghép các chữ số đúng vị trí để được số 212.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-02",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Số gồm 9 trăm, 0 chục và 4 đơn vị là số nào?",
      "options": {"A": "804", "B": "902", "C": "904", "D": "924"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 9, "tens": 0, "ones": 4, "description": "Bảng giá trị hàng biểu diễn 9 trăm, 0 chục và 4 đơn vị."},
      "skill_code": "NUMBER_RECOGNITION_TO_1000",
      "difficulty": "EASY",
      "display_order": 2,
      "correct_answer": "C",
      "solution_steps": ["Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.", "Ghép các chữ số đúng vị trí để được số 904."],
      "explanation": "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng. Ghép các chữ số đúng vị trí để được số 904.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-03",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Số gồm 2 trăm, 9 chục và 3 đơn vị là số nào?",
      "options": {"A": "293", "B": "303", "C": "294", "D": "283"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 2, "tens": 9, "ones": 3, "description": "Bảng giá trị hàng biểu diễn 2 trăm, 9 chục và 3 đơn vị."},
      "skill_code": "NUMBER_RECOGNITION_TO_1000",
      "difficulty": "EASY",
      "display_order": 3,
      "correct_answer": "A",
      "solution_steps": ["Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.", "Ghép các chữ số đúng vị trí để được số 293."],
      "explanation": "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng. Ghép các chữ số đúng vị trí để được số 293.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-04",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Số gồm 7 trăm, 5 chục và 2 đơn vị là số nào?",
      "options": {"A": "752", "B": "742", "C": "852", "D": "754"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 7, "tens": 5, "ones": 2, "description": "Bảng giá trị hàng biểu diễn 7 trăm, 5 chục và 2 đơn vị."},
      "skill_code": "NUMBER_RECOGNITION_TO_1000",
      "difficulty": "EASY",
      "display_order": 4,
      "correct_answer": "A",
      "solution_steps": ["Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.", "Ghép các chữ số đúng vị trí để được số 752."],
      "explanation": "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng. Ghép các chữ số đúng vị trí để được số 752.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-05",
      "question_type": "NUMBER_INPUT",
      "prompt": "Số gồm 1 trăm, 7 chục và 8 đơn vị là số nào?",
      "options": null,
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 1, "tens": 7, "ones": 8, "description": "Bảng giá trị hàng biểu diễn 1 trăm, 7 chục và 8 đơn vị."},
      "skill_code": "NUMBER_RECOGNITION_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 5,
      "correct_answer": "178",
      "solution_steps": ["Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.", "Ghép các chữ số đúng vị trí để được số 178."],
      "explanation": "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng. Ghép các chữ số đúng vị trí để được số 178.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-06",
      "question_type": "NUMBER_INPUT",
      "prompt": "Số gồm 3 trăm, 0 chục và 5 đơn vị là số nào?",
      "options": null,
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 3, "tens": 0, "ones": 5, "description": "Bảng giá trị hàng biểu diễn 3 trăm, 0 chục và 5 đơn vị."},
      "skill_code": "NUMBER_RECOGNITION_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 6,
      "correct_answer": "305",
      "solution_steps": ["Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng.", "Ghép các chữ số đúng vị trí để được số 305."],
      "explanation": "Đọc lần lượt số nghìn, số trăm, số chục và số đơn vị trong bảng. Ghép các chữ số đúng vị trí để được số 305.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-07",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Cách đọc nào đúng cho số 563?",
      "options": {"A": "năm trăm sáu mươi lăm", "B": "năm trăm tám mươi ba", "C": "năm trăm bảy mươi ba", "D": "năm trăm sáu mươi ba"},
      "visual_spec": {"kind": "NUMBER_CARD", "value": 563, "description": "Một thẻ số lớn hiển thị 563."},
      "skill_code": "READ_WRITE_TO_1000",
      "difficulty": "EASY",
      "display_order": 7,
      "correct_answer": "D",
      "solution_steps": ["Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.", "Số 563 được đọc là “năm trăm sáu mươi ba”."],
      "explanation": "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại. Số 563 được đọc là “năm trăm sáu mươi ba”.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-08",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Cách đọc nào đúng cho số 191?",
      "options": {"A": "chín mươi mốt", "B": "một trăm chín mươi mốt", "C": "hai trăm linh một", "D": "một trăm tám mươi chín"},
      "visual_spec": {"kind": "NUMBER_CARD", "value": 191, "description": "Một thẻ số lớn hiển thị 191."},
      "skill_code": "READ_WRITE_TO_1000",
      "difficulty": "EASY",
      "display_order": 8,
      "correct_answer": "B",
      "solution_steps": ["Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.", "Số 191 được đọc là “một trăm chín mươi mốt”."],
      "explanation": "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại. Số 191 được đọc là “một trăm chín mươi mốt”.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-09",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Cách đọc nào đúng cho số 697?",
      "options": {"A": "sáu trăm chín mươi bảy", "B": "sáu trăm chín mươi tám", "C": "sáu trăm bảy mươi bảy", "D": "bảy trăm mười bảy"},
      "visual_spec": {"kind": "NUMBER_CARD", "value": 697, "description": "Một thẻ số lớn hiển thị 697."},
      "skill_code": "READ_WRITE_TO_1000",
      "difficulty": "EASY",
      "display_order": 9,
      "correct_answer": "A",
      "solution_steps": ["Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.", "Số 697 được đọc là “sáu trăm chín mươi bảy”."],
      "explanation": "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại. Số 697 được đọc là “sáu trăm chín mươi bảy”.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-10",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Cách đọc nào đúng cho số 734?",
      "options": {"A": "bảy trăm hai mươi tư", "B": "bảy trăm ba mươi hai", "C": "bảy trăm ba mươi lăm", "D": "bảy trăm ba mươi tư"},
      "visual_spec": {"kind": "NUMBER_CARD", "value": 734, "description": "Một thẻ số lớn hiển thị 734."},
      "skill_code": "READ_WRITE_TO_1000",
      "difficulty": "EASY",
      "display_order": 10,
      "correct_answer": "D",
      "solution_steps": ["Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.", "Số 734 được đọc là “bảy trăm ba mươi tư”."],
      "explanation": "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại. Số 734 được đọc là “bảy trăm ba mươi tư”.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-11",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Cách đọc nào đúng cho số 976?",
      "options": {"A": "chín trăm bảy mươi sáu", "B": "chín trăm năm mươi sáu", "C": "chín trăm chín mươi sáu", "D": "tám trăm bảy mươi sáu"},
      "visual_spec": {"kind": "NUMBER_CARD", "value": 976, "description": "Một thẻ số lớn hiển thị 976."},
      "skill_code": "READ_WRITE_TO_1000",
      "difficulty": "EASY",
      "display_order": 11,
      "correct_answer": "A",
      "solution_steps": ["Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.", "Số 976 được đọc là “chín trăm bảy mươi sáu”."],
      "explanation": "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại. Số 976 được đọc là “chín trăm bảy mươi sáu”.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-12",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Cách đọc nào đúng cho số 148?",
      "options": {"A": "một trăm bốn mươi tám", "B": "một trăm hai mươi tám", "C": "một trăm bốn mươi chín", "D": "một trăm năm mươi"},
      "visual_spec": {"kind": "NUMBER_CARD", "value": 148, "description": "Một thẻ số lớn hiển thị 148."},
      "skill_code": "READ_WRITE_TO_1000",
      "difficulty": "EASY",
      "display_order": 12,
      "correct_answer": "A",
      "solution_steps": ["Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại.", "Số 148 được đọc là “một trăm bốn mươi tám”."],
      "explanation": "Đọc từ hàng cao nhất có chữ số khác 0 rồi tiếp tục qua các hàng còn lại. Số 148 được đọc là “một trăm bốn mươi tám”.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-13",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Trong số 536, chữ số hàng trăm là mấy?",
      "options": {"A": "3", "B": "4", "C": "7", "D": "5"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 5, "tens": 3, "ones": 6, "description": "Bảng giá trị hàng biểu diễn 5 trăm, 3 chục và 6 đơn vị."},
      "skill_code": "PLACE_VALUE_TO_1000",
      "difficulty": "EASY",
      "display_order": 13,
      "correct_answer": "D",
      "solution_steps": ["Tách số 536 theo từng hàng trong bảng giá trị.", "Chữ số ở hàng trăm là 5."],
      "explanation": "Tách số 536 theo từng hàng trong bảng giá trị. Chữ số ở hàng trăm là 5.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-14",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Trong số 915, chữ số hàng chục là mấy?",
      "options": {"A": "3", "B": "2", "C": "0", "D": "1"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 9, "tens": 1, "ones": 5, "description": "Bảng giá trị hàng biểu diễn 9 trăm, 1 chục và 5 đơn vị."},
      "skill_code": "PLACE_VALUE_TO_1000",
      "difficulty": "EASY",
      "display_order": 14,
      "correct_answer": "D",
      "solution_steps": ["Tách số 915 theo từng hàng trong bảng giá trị.", "Chữ số ở hàng chục là 1."],
      "explanation": "Tách số 915 theo từng hàng trong bảng giá trị. Chữ số ở hàng chục là 1.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-15",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Trong số 717, chữ số hàng đơn vị là mấy?",
      "options": {"A": "8", "B": "5", "C": "9", "D": "7"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 7, "tens": 1, "ones": 7, "description": "Bảng giá trị hàng biểu diễn 7 trăm, 1 chục và 7 đơn vị."},
      "skill_code": "PLACE_VALUE_TO_1000",
      "difficulty": "EASY",
      "display_order": 15,
      "correct_answer": "D",
      "solution_steps": ["Tách số 717 theo từng hàng trong bảng giá trị.", "Chữ số ở hàng đơn vị là 7."],
      "explanation": "Tách số 717 theo từng hàng trong bảng giá trị. Chữ số ở hàng đơn vị là 7.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-16",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Trong số 544, chữ số hàng trăm là mấy?",
      "options": {"A": "5", "B": "3", "C": "7", "D": "4"},
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 5, "tens": 4, "ones": 4, "description": "Bảng giá trị hàng biểu diễn 5 trăm, 4 chục và 4 đơn vị."},
      "skill_code": "PLACE_VALUE_TO_1000",
      "difficulty": "EASY",
      "display_order": 16,
      "correct_answer": "A",
      "solution_steps": ["Tách số 544 theo từng hàng trong bảng giá trị.", "Chữ số ở hàng trăm là 5."],
      "explanation": "Tách số 544 theo từng hàng trong bảng giá trị. Chữ số ở hàng trăm là 5.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-17",
      "question_type": "NUMBER_INPUT",
      "prompt": "Trong số 231, chữ số hàng chục là mấy?",
      "options": null,
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 2, "tens": 3, "ones": 1, "description": "Bảng giá trị hàng biểu diễn 2 trăm, 3 chục và 1 đơn vị."},
      "skill_code": "PLACE_VALUE_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 17,
      "correct_answer": "3",
      "solution_steps": ["Tách số 231 theo từng hàng trong bảng giá trị.", "Chữ số ở hàng chục là 3."],
      "explanation": "Tách số 231 theo từng hàng trong bảng giá trị. Chữ số ở hàng chục là 3.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-18",
      "question_type": "NUMBER_INPUT",
      "prompt": "Trong số 742, chữ số hàng chục là mấy?",
      "options": null,
      "visual_spec": {"kind": "PLACE_VALUE_CHART", "thousands": 0, "hundreds": 7, "tens": 4, "ones": 2, "description": "Bảng giá trị hàng biểu diễn 7 trăm, 4 chục và 2 đơn vị."},
      "skill_code": "PLACE_VALUE_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 18,
      "correct_answer": "4",
      "solution_steps": ["Tách số 742 theo từng hàng trong bảng giá trị.", "Chữ số ở hàng chục là 4."],
      "explanation": "Tách số 742 theo từng hàng trong bảng giá trị. Chữ số ở hàng chục là 4.",
      "hint": "Em hãy đọc các hàng từ trái sang phải."
    },
    {
      "code": "g2-num1000-1nighc4-19",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Số liền trước của 459 là số nào?",
      "options": {"A": "460", "B": "438", "C": "558", "D": "458"},
      "visual_spec": {"kind": "NUMBER_LINE", "start": 457, "end": 461, "focusValue": 459, "description": "Tia số tăng từng một đơn vị; mốc 459 được đóng khung bằng nét đậm."},
      "skill_code": "SEQUENCE_TO_1000",
      "difficulty": "EASY",
      "display_order": 19,
      "correct_answer": "D",
      "solution_steps": ["Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị.", "459 bớt 1 được 458."],
      "explanation": "Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị. 459 bớt 1 được 458.",
      "hint": "Em hãy di chuyển đúng một bước trên tia số."
    },
    {
      "code": "g2-num1000-1nighc4-20",
      "question_type": "MULTIPLE_CHOICE",
      "prompt": "Số liền sau của 634 là số nào?",
      "options": {"A": "535", "B": "635", "C": "615", "D": "634"},
      "visual_spec": {"kind": "NUMBER_LINE", "start": 632, "end": 636, "focusValue": 634, "description": "Tia số tăng từng một đơn vị; mốc 634 được đóng khung bằng nét đậm."},
      "skill_code": "SEQUENCE_TO_1000",
      "difficulty": "EASY",
      "display_order": 20,
      "correct_answer": "B",
      "solution_steps": ["Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị.", "634 thêm 1 được 635."],
      "explanation": "Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị. 634 thêm 1 được 635.",
      "hint": "Em hãy di chuyển đúng một bước trên tia số."
    },
    {
      "code": "g2-num1000-1nighc4-21",
      "question_type": "NUMBER_INPUT",
      "prompt": "Số liền trước của 507 là số nào?",
      "options": null,
      "visual_spec": {"kind": "NUMBER_LINE", "start": 505, "end": 509, "focusValue": 507, "description": "Tia số tăng từng một đơn vị; mốc 507 được đóng khung bằng nét đậm."},
      "skill_code": "SEQUENCE_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 21,
      "correct_answer": "506",
      "solution_steps": ["Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị.", "507 bớt 1 được 506."],
      "explanation": "Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị. 507 bớt 1 được 506.",
      "hint": "Em hãy di chuyển đúng một bước trên tia số."
    },
    {
      "code": "g2-num1000-1nighc4-22",
      "question_type": "NUMBER_INPUT",
      "prompt": "Số liền sau của 76 là số nào?",
      "options": null,
      "visual_spec": {"kind": "NUMBER_LINE", "start": 74, "end": 78, "focusValue": 76, "description": "Tia số tăng từng một đơn vị; mốc 76 được đóng khung bằng nét đậm."},
      "skill_code": "SEQUENCE_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 22,
      "correct_answer": "77",
      "solution_steps": ["Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị.", "76 thêm 1 được 77."],
      "explanation": "Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị. 76 thêm 1 được 77.",
      "hint": "Em hãy di chuyển đúng một bước trên tia số."
    },
    {
      "code": "g2-num1000-1nighc4-23",
      "question_type": "NUMBER_INPUT",
      "prompt": "Số liền trước của 705 là số nào?",
      "options": null,
      "visual_spec": {"kind": "NUMBER_LINE", "start": 703, "end": 707, "focusValue": 705, "description": "Tia số tăng từng một đơn vị; mốc 705 được đóng khung bằng nét đậm."},
      "skill_code": "SEQUENCE_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 23,
      "correct_answer": "704",
      "solution_steps": ["Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị.", "705 bớt 1 được 704."],
      "explanation": "Số liền trước đứng ngay bên trái và kém số đã cho 1 đơn vị. 705 bớt 1 được 704.",
      "hint": "Em hãy di chuyển đúng một bước trên tia số."
    },
    {
      "code": "g2-num1000-1nighc4-24",
      "question_type": "NUMBER_INPUT",
      "prompt": "Số liền sau của 116 là số nào?",
      "options": null,
      "visual_spec": {"kind": "NUMBER_LINE", "start": 114, "end": 118, "focusValue": 116, "description": "Tia số tăng từng một đơn vị; mốc 116 được đóng khung bằng nét đậm."},
      "skill_code": "SEQUENCE_TO_1000",
      "difficulty": "MEDIUM",
      "display_order": 24,
      "correct_answer": "117",
      "solution_steps": ["Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị.", "116 thêm 1 được 117."],
      "explanation": "Số liền sau đứng ngay bên phải và hơn số đã cho 1 đơn vị. 116 thêm 1 được 117.",
      "hint": "Em hãy di chuyển đúng một bước trên tia số."
    }
  ]$release_bank$::jsonb;
begin
  insert into public.questions (
    code,
    unit_slug,
    question_type,
    prompt,
    options,
    visual_spec,
    skill_code,
    difficulty,
    display_order,
    published
  )
  select
    code,
    'grade-2-numbers-to-1000',
    question_type,
    prompt,
    options,
    visual_spec,
    skill_code,
    difficulty,
    display_order,
    false
  from pg_catalog.jsonb_to_recordset(v_release_bank) as seed (
  code text,
  question_type text,
  prompt text,
  options jsonb,
  visual_spec jsonb,
  skill_code text,
  difficulty text,
  display_order integer,
  correct_answer text,
  solution_steps jsonb,
  explanation text,
  hint text
  );

  insert into public.question_solutions (
    question_id,
    correct_answer,
    solution_steps,
    explanation,
    hint
  )
  select
    code,
    correct_answer,
    solution_steps,
    explanation,
    hint
  from pg_catalog.jsonb_to_recordset(v_release_bank) as seed (
    code text,
    correct_answer text,
    solution_steps jsonb,
    explanation text,
    hint text
  );
end;
$seed$;

do $$
declare
  v_errors text[] := array[]::text[];
  v_count integer;
  v_function_definition text;
  v_constraint_definition text;
begin
  select count(*)
  into v_count
  from public.learning_units
  where
    slug = 'grade-2-numbers-to-1000'
    and grade = 2
    and display_order = 1
    and total_questions = 24
    and published is false
    and prerequisite_unit_slug is null
    and pg_catalog.jsonb_array_length(learning_objectives) = 4
    and pg_catalog.jsonb_array_length(lesson_content -> 'sections') = 6
    and pg_catalog.jsonb_array_length(
      lesson_content -> 'worked_examples'
    ) = 2;
  if v_count <> 1 then
    v_errors := array_append(
      v_errors,
      'DRAFT/HIDDEN learning unit metadata is invalid'
    );
  end if;

  select count(*)
  into v_count
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and published is false;
  if v_count <> 24 then
    v_errors := array_append(v_errors, 'Question count/status is invalid');
  end if;

  select count(*)
  into v_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-2-numbers-to-1000';
  if v_count <> 24 then
    v_errors := array_append(v_errors, 'Solution count is invalid');
  end if;

  select count(*)
  into v_count
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and question_type = 'MULTIPLE_CHOICE';
  if v_count <> 16 then
    v_errors := array_append(v_errors, 'MCQ distribution is invalid');
  end if;

  select count(*)
  into v_count
  from public.questions
  where
    unit_slug = 'grade-2-numbers-to-1000'
    and question_type = 'NUMBER_INPUT';
  if v_count <> 8 then
    v_errors := array_append(
      v_errors,
      'NUMBER_INPUT distribution is invalid'
    );
  end if;

  select count(*)
  into v_count
  from (
    select skill_code
    from public.questions
    where unit_slug = 'grade-2-numbers-to-1000'
    group by skill_code
    having count(*) = 6
  ) as valid_skill;
  if v_count <> 4 then
    v_errors := array_append(v_errors, 'Skill distribution is invalid');
  end if;

  select count(*)
  into v_count
  from (
    select prompt
    from public.questions
    where unit_slug = 'grade-2-numbers-to-1000'
    group by prompt
    having count(*) > 1
  ) as duplicate_prompt;
  if v_count <> 0 then
    v_errors := array_append(v_errors, 'Duplicate prompt detected');
  end if;

  select count(*)
  into v_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-2-numbers-to-1000'
    and question.question_type = 'MULTIPLE_CHOICE'
    and (
      question.options is null
      or pg_catalog.jsonb_typeof(question.options) <> 'object'
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(question.options)
      ) <> 4
      or not (question.options ?& array['A', 'B', 'C', 'D'])
      or solution.correct_answer !~ '^[A-D]$'
      or not (question.options ? solution.correct_answer)
    );
  if v_count <> 0 then
    v_errors := array_append(v_errors, 'MCQ option/answer integrity failed');
  end if;

  select count(*)
  into v_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-2-numbers-to-1000'
    and question.question_type = 'NUMBER_INPUT'
    and (
      question.options is not null
      or solution.correct_answer !~ '^[0-9]{1,4}$'
      or solution.correct_answer::integer not between 0 and 1000
    );
  if v_count <> 0 then
    v_errors := array_append(
      v_errors,
      'NUMBER_INPUT answer integrity failed'
    );
  end if;

  select count(*)
  into v_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-2-numbers-to-1000'
    and (
      question.code !~ '^g2-num1000-[a-z0-9]+-[0-9]{2}$'
      or not private.is_valid_grade2_number_visual_spec(
        question.visual_spec
      )
      or pg_catalog.jsonb_typeof(solution.solution_steps) <> 'array'
      or pg_catalog.jsonb_array_length(solution.solution_steps) < 2
      or btrim(solution.explanation) = ''
      or btrim(solution.hint) = ''
    );
  if v_count <> 0 then
    v_errors := array_append(
      v_errors,
      'Visual, solution or stable-ID validation failed'
    );
  end if;

  select count(*)
  into v_count
  from public.questions as question
  left join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-2-numbers-to-1000'
    and solution.question_id is null;
  if v_count <> 0 then
    v_errors := array_append(v_errors, 'Orphan question detected');
  end if;

  select count(*)
  into v_count
  from public.question_solutions as solution
  left join public.questions as question
    on question.code = solution.question_id
  where
    question.code is null;
  if v_count <> 0 then
    v_errors := array_append(v_errors, 'Orphan solution detected');
  end if;

  select count(*)
  into v_count
  from public.practice_attempts
  where unit_slug = 'grade-2-numbers-to-1000';
  if v_count <> 0 then
    v_errors := array_append(
      v_errors,
      'Hidden candidate unexpectedly has practice attempts'
    );
  end if;

  select count(*)
  into v_count
  from public.learning_units
  where grade = 1 and published is true;
  if v_count <> 13 then
    v_errors := array_append(
      v_errors,
      'Grade 1 unit baseline changed unexpectedly'
    );
  end if;

  select count(*)
  into v_count
  from public.questions as question
  join public.learning_units as unit
    on unit.slug = question.unit_slug
  where
    unit.grade = 1
    and unit.published is true
    and question.published is true;
  if v_count <> 312 then
    v_errors := array_append(
      v_errors,
      'Grade 1 question baseline changed unexpectedly'
    );
  end if;

  if
    pg_catalog.has_table_privilege(
      'anon',
      'public.question_solutions',
      'select'
    )
    or pg_catalog.has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'select'
    )
  then
    v_errors := array_append(
      v_errors,
      'Browser role can directly read question_solutions'
    );
  end if;

  select pg_catalog.pg_get_constraintdef(oid)
  into v_constraint_definition
  from pg_catalog.pg_constraint
  where
    conrelid = 'public.questions'::regclass
    and conname = 'questions_visual_spec_check';
  if
    v_constraint_definition is null
    or v_constraint_definition !~ 'is_valid_grade2_number_visual_spec'
  then
    v_errors := array_append(
      v_errors,
      'Grade 2 visual constraint is missing'
    );
  end if;

  select string_agg(
    pg_catalog.pg_get_functiondef(procedure.oid),
    E'\n'
  )
  into v_function_definition
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where
    namespace.nspname = 'public'
    and procedure.proname = 'start_or_resume_practice';
  if
    v_function_definition is null
    or v_function_definition !~ 'unit[.]published'
    or v_function_definition !~ 'auth[.]uid[(][)]'
  then
    v_errors := array_append(
      v_errors,
      'Practice RPC does not fail closed on hidden units'
    );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where
      schemaname = 'public'
      and tablename = 'learning_units'
      and roles::text ~ 'authenticated'
      and qual ~ 'published'
  ) then
    v_errors := array_append(
      v_errors,
      'Published-only learning unit policy is missing'
    );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where
      schemaname = 'public'
      and tablename = 'questions'
      and roles::text ~ 'authenticated'
      and qual ~ 'published'
  ) then
    v_errors := array_append(
      v_errors,
      'Published-only question policy is missing'
    );
  end if;

  if pg_catalog.array_length(v_errors, 1) is not null then
    raise exception
      'Grade 2 release-candidate validation failed: %',
      pg_catalog.array_to_string(v_errors, '; ');
  end if;
end;
$$;

commit;
