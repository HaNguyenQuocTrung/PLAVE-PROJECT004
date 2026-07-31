begin;

create or replace function private.is_valid_practice_visual_spec(
  p_spec jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_item jsonb;
  v_ids text[] := array[]::text[];
  v_labels text[] := array[]::text[];
  v_x integer;
  v_y integer;
  v_width integer;
  v_height integer;
  v_start integer;
  v_end integer;
  v_length integer;
  v_unit_width integer;
  v_end_value integer;
  v_max_value integer;
begin
  if
    pg_catalog.jsonb_typeof(p_spec) <> 'object'
    or pg_catalog.jsonb_typeof(p_spec -> 'kind') <> 'string'
    or pg_catalog.jsonb_typeof(p_spec -> 'description') <> 'string'
    or char_length(btrim(p_spec ->> 'description')) not between 12 and 240
    or btrim(p_spec ->> 'description') <> p_spec ->> 'description'
    or lower(p_spec ->> 'description')
      ~ '(https?:|www[.]|javascript:|data:|<|>)'
  then
    return false;
  end if;

  if p_spec ->> 'kind' = 'SHAPE_SCENE' then
    if
      not (p_spec ?& array['kind', 'description', 'items'])
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 3
      or pg_catalog.jsonb_typeof(p_spec -> 'items') <> 'array'
      or pg_catalog.jsonb_array_length(p_spec -> 'items') not between 1 and 8
    then
      return false;
    end if;

    for v_item in
      select item
      from pg_catalog.jsonb_array_elements(p_spec -> 'items') as item
    loop
      if
        pg_catalog.jsonb_typeof(v_item) <> 'object'
        or not (
          v_item ?& array[
            'id',
            'shape',
            'x',
            'y',
            'width',
            'height',
            'label'
          ]
        )
        or (
          select count(*)
          from pg_catalog.jsonb_object_keys(v_item)
        ) <> 7
        or coalesce(v_item ->> 'id', '') !~ '^[a-z][a-z0-9-]{0,19}$'
        or coalesce(v_item ->> 'shape', '') not in (
          'CIRCLE',
          'TRIANGLE',
          'SQUARE',
          'RECTANGLE'
        )
        or pg_catalog.jsonb_typeof(v_item -> 'x') <> 'number'
        or pg_catalog.jsonb_typeof(v_item -> 'y') <> 'number'
        or pg_catalog.jsonb_typeof(v_item -> 'width') <> 'number'
        or pg_catalog.jsonb_typeof(v_item -> 'height') <> 'number'
        or coalesce(v_item ->> 'x', '') !~ '^(0|[1-9][0-9]?)$'
        or coalesce(v_item ->> 'y', '') !~ '^(0|[1-9][0-9]?)$'
        or coalesce(v_item ->> 'width', '') !~ '^(1[2-9]|2[0-9]|3[0-2])$'
        or coalesce(v_item ->> 'height', '') !~ '^(1[2-9]|2[0-9]|3[0-2])$'
        or pg_catalog.jsonb_typeof(v_item -> 'label') <> 'string'
        or char_length(btrim(v_item ->> 'label')) not between 1 and 20
        or btrim(v_item ->> 'label') <> v_item ->> 'label'
        or lower(v_item ->> 'label')
          ~ '(https?:|www[.]|javascript:|data:|<|>)'
      then
        return false;
      end if;

      v_x := (v_item ->> 'x')::integer;
      v_y := (v_item ->> 'y')::integer;
      v_width := (v_item ->> 'width')::integer;
      v_height := (v_item ->> 'height')::integer;

      if
        v_x > 88
        or v_y > 88
        or v_x + v_width > 100
        or v_y + v_height > 100
        or (
          v_item ->> 'shape' in ('CIRCLE', 'TRIANGLE', 'SQUARE')
          and v_width <> v_height
        )
        or (
          v_item ->> 'shape' = 'RECTANGLE'
          and v_width = v_height
        )
        or v_item ->> 'id' = any(v_ids)
      then
        return false;
      end if;

      v_ids := array_append(v_ids, v_item ->> 'id');
    end loop;

    return true;
  end if;

  if p_spec ->> 'kind' = 'LENGTH_COMPARISON' then
    if
      not (p_spec ?& array['kind', 'description', 'items'])
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 3
      or pg_catalog.jsonb_typeof(p_spec -> 'items') <> 'array'
      or pg_catalog.jsonb_array_length(p_spec -> 'items') not between 2 and 4
    then
      return false;
    end if;

    v_ids := array[]::text[];
    for v_item in
      select item
      from pg_catalog.jsonb_array_elements(p_spec -> 'items') as item
    loop
      if
        pg_catalog.jsonb_typeof(v_item) <> 'object'
        or not (
          v_item ?& array[
            'id',
            'label',
            'startX',
            'y',
            'length',
            'pattern'
          ]
        )
        or (
          select count(*)
          from pg_catalog.jsonb_object_keys(v_item)
        ) <> 6
        or coalesce(v_item ->> 'id', '') !~ '^[a-z][a-z0-9-]{0,19}$'
        or pg_catalog.jsonb_typeof(v_item -> 'label') <> 'string'
        or char_length(btrim(v_item ->> 'label')) not between 1 and 24
        or btrim(v_item ->> 'label') <> v_item ->> 'label'
        or lower(v_item ->> 'label')
          ~ '(https?:|www[.]|javascript:|data:|<|>)'
        or pg_catalog.jsonb_typeof(v_item -> 'startX') <> 'number'
        or pg_catalog.jsonb_typeof(v_item -> 'y') <> 'number'
        or pg_catalog.jsonb_typeof(v_item -> 'length') <> 'number'
        or coalesce(v_item ->> 'startX', '') !~ '^[0-9]+$'
        or coalesce(v_item ->> 'y', '') !~ '^[0-9]+$'
        or coalesce(v_item ->> 'length', '') !~ '^[0-9]+$'
        or coalesce(v_item ->> 'pattern', '') not in (
          'SOLID',
          'DASHED',
          'DOUBLE'
        )
      then
        return false;
      end if;

      v_start := (v_item ->> 'startX')::integer;
      v_y := (v_item ->> 'y')::integer;
      v_length := (v_item ->> 'length')::integer;

      if
        v_start not between 5 and 70
        or v_y not between 10 and 82
        or v_length not between 10 and 80
        or v_start + v_length > 95
        or v_item ->> 'id' = any(v_ids)
        or v_item ->> 'label' = any(v_labels)
      then
        return false;
      end if;

      v_ids := array_append(v_ids, v_item ->> 'id');
      v_labels := array_append(v_labels, v_item ->> 'label');
    end loop;

    if (
      select count(distinct (item ->> 'startX')::integer)
      from pg_catalog.jsonb_array_elements(p_spec -> 'items') as item
    ) <> 1 then
      return false;
    end if;

    return true;
  end if;

  if p_spec ->> 'kind' = 'EQUAL_UNIT_MEASUREMENT' then
    if
      not (
        p_spec ?& array[
          'kind',
          'description',
          'objectLabel',
          'unitLabel',
          'startX',
          'endX',
          'y',
          'unitWidth'
        ]
      )
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 8
      or pg_catalog.jsonb_typeof(p_spec -> 'objectLabel') <> 'string'
      or char_length(btrim(p_spec ->> 'objectLabel')) not between 1 and 32
      or btrim(p_spec ->> 'objectLabel') <> p_spec ->> 'objectLabel'
      or pg_catalog.jsonb_typeof(p_spec -> 'unitLabel') <> 'string'
      or char_length(btrim(p_spec ->> 'unitLabel')) not between 1 and 20
      or btrim(p_spec ->> 'unitLabel') <> p_spec ->> 'unitLabel'
      or lower(
        (p_spec ->> 'objectLabel') || ' ' || (p_spec ->> 'unitLabel')
      ) ~ '(https?:|www[.]|javascript:|data:|<|>)'
      or pg_catalog.jsonb_typeof(p_spec -> 'startX') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'endX') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'y') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'unitWidth') <> 'number'
      or coalesce(p_spec ->> 'startX', '') !~ '^[0-9]+$'
      or coalesce(p_spec ->> 'endX', '') !~ '^[0-9]+$'
      or coalesce(p_spec ->> 'y', '') !~ '^[0-9]+$'
      or coalesce(p_spec ->> 'unitWidth', '') !~ '^[0-9]+$'
    then
      return false;
    end if;

    v_start := (p_spec ->> 'startX')::integer;
    v_end := (p_spec ->> 'endX')::integer;
    v_y := (p_spec ->> 'y')::integer;
    v_unit_width := (p_spec ->> 'unitWidth')::integer;

    return
      v_start between 5 and 30
      and v_end between 30 and 95
      and v_end > v_start
      and v_y between 20 and 65
      and v_unit_width between 5 and 15
      and (v_end - v_start) % v_unit_width = 0
      and (v_end - v_start) / v_unit_width between 2 and 10;
  end if;

  if p_spec ->> 'kind' = 'SIMPLE_RULER' then
    if
      not (
        p_spec ?& array[
          'kind',
          'description',
          'objectLabel',
          'unitLabel',
          'startValue',
          'endValue',
          'maxValue'
        ]
      )
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 7
      or pg_catalog.jsonb_typeof(p_spec -> 'objectLabel') <> 'string'
      or char_length(btrim(p_spec ->> 'objectLabel')) not between 1 and 32
      or btrim(p_spec ->> 'objectLabel') <> p_spec ->> 'objectLabel'
      or lower(p_spec ->> 'objectLabel')
        ~ '(https?:|www[.]|javascript:|data:|<|>)'
      or p_spec ->> 'unitLabel' <> 'cm'
      or pg_catalog.jsonb_typeof(p_spec -> 'startValue') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'endValue') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'maxValue') <> 'number'
      or coalesce(p_spec ->> 'startValue', '') !~ '^[0-9]+$'
      or coalesce(p_spec ->> 'endValue', '') !~ '^[0-9]+$'
      or coalesce(p_spec ->> 'maxValue', '') !~ '^[0-9]+$'
    then
      return false;
    end if;

    v_start := (p_spec ->> 'startValue')::integer;
    v_end_value := (p_spec ->> 'endValue')::integer;
    v_max_value := (p_spec ->> 'maxValue')::integer;

    return
      v_start = 0
      and v_end_value between 1 and 10
      and v_max_value between 5 and 10
      and v_end_value <= v_max_value;
  end if;

  return false;
exception
  when others then
    return false;
end;
$$;

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
    'READ_SIMPLE_MEASUREMENT'
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
  'grade-1-length-measurement',
  1,
  'Đo độ dài và so sánh độ dài',
  'So sánh độ dài và đo vật bằng đơn vị bằng nhau hoặc thước xăng-ti-mét.',
  $objectives$[
    "Nhận biết và dùng đúng các từ dài hơn, ngắn hơn và bằng nhau.",
    "Sắp xếp được một nhóm vật theo độ dài.",
    "Đo được một vật bằng các đơn vị bằng nhau đặt liên tiếp.",
    "Đọc được phép đo đơn giản trên thước xăng-ti-mét khi vật bắt đầu tại vạch 0."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "longer-shorter-equal",
        "title": "Dài hơn, ngắn hơn và bằng nhau",
        "paragraphs": [
          "Ta có thể nói một vật dài hơn, ngắn hơn hoặc dài bằng vật khác.",
          "Khi hai vật không cùng điểm đầu, mắt ta dễ bị nhầm. Vì vậy cần đặt hai vật cùng một điểm bắt đầu."
        ]
      },
      {
        "code": "compare-from-same-start",
        "title": "So sánh từ cùng một điểm bắt đầu",
        "paragraphs": [
          "Đặt một đầu của hai vật thẳng hàng. Vật vươn xa hơn thì dài hơn; vật dừng sớm hơn thì ngắn hơn.",
          "Nếu hai vật cùng điểm đầu và cùng điểm cuối, chúng dài bằng nhau."
        ]
      },
      {
        "code": "order-by-length",
        "title": "Sắp xếp theo độ dài",
        "paragraphs": [
          "Để sắp xếp nhiều vật, ta đặt chúng cùng điểm đầu rồi tìm vật ngắn nhất hoặc dài nhất trước.",
          "Sau đó tiếp tục so sánh các vật còn lại để có thứ tự từ ngắn đến dài hoặc từ dài đến ngắn."
        ]
      },
      {
        "code": "equal-repeated-units",
        "title": "Đo bằng các đơn vị bằng nhau",
        "paragraphs": [
          "Khi dùng ô, que hoặc đoạn nhỏ làm đơn vị đo, mọi đơn vị phải có kích thước bằng nhau.",
          "Đặt các đơn vị liên tiếp, không chồng lên nhau và không để khoảng trống. Số đo là số đơn vị phủ hết chiều dài vật."
        ]
      },
      {
        "code": "centimetre-ruler",
        "title": "Đo bằng thước xăng-ti-mét",
        "paragraphs": [
          "Xăng-ti-mét được viết tắt là cm. Trên thước, mỗi khoảng từ một vạch số đến vạch số tiếp theo là 1 cm.",
          "Đặt một đầu vật tại vạch 0 rồi nhìn vạch trùng với đầu còn lại để đọc số đo."
        ]
      },
      {
        "code": "read-and-check",
        "title": "Đọc và kiểm tra số đo",
        "paragraphs": [
          "Trước khi đọc kết quả, kiểm tra lại điểm bắt đầu, điểm kết thúc và đơn vị đo.",
          "Nếu dùng thước và vật bắt đầu ở vạch 0, số tại vạch kết thúc cho biết độ dài của vật theo cm."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "So sánh ba dải giấy",
        "steps": [
          "Đặt đầu trái của ba dải giấy thẳng hàng tại cùng một điểm.",
          "Quan sát điểm cuối: dải B dừng sớm nhất, dải A dừng sau dải B, dải C vươn xa nhất.",
          "Sắp xếp theo thứ tự điểm cuối từ gần đến xa."
        ],
        "answer": "Từ ngắn đến dài là dải B, dải A, dải C."
      },
      {
        "title": "Đo một dải giấy bằng thước",
        "steps": [
          "Đặt một đầu dải giấy trùng với vạch 0 trên thước.",
          "Giữ dải giấy thẳng và nhìn đầu còn lại trùng với vạch 6.",
          "Đọc số 6 và ghi thêm đơn vị cm."
        ],
        "answer": "Dải giấy dài 6 cm."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  11,
  'grade-1-basic-geometry-and-position'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from pg_catalog.jsonb_to_recordset(
    $questions$[
      {"code":"g1-len-q01","question_type":"MULTIPLE_CHOICE","prompt":"Hai dải cùng điểm đầu. Dải nào dài hơn?","options":{"A":"Dải A","B":"Dải B","C":"Hai dải bằng nhau","D":"Chưa thể so sánh"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Hai dải A và B có cùng điểm bắt đầu và có điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":15,"y":32,"length":52,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":66,"length":35,"pattern":"DASHED"}]},"skill_code":"COMPARE_LENGTHS","difficulty":"EASY","display_order":1,"check":{"kind":"LONGEST","target":"a"},"expected_answer":"Dải A"},
      {"code":"g1-len-q02","question_type":"MULTIPLE_CHOICE","prompt":"Hai dải cùng điểm đầu. Dải nào ngắn hơn?","options":{"A":"Dải A","B":"Dải B","C":"Hai dải bằng nhau","D":"Chưa thể so sánh"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Hai dải A và B có cùng điểm bắt đầu và có điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":15,"y":32,"length":28,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":66,"length":45,"pattern":"DOUBLE"}]},"skill_code":"COMPARE_LENGTHS","difficulty":"EASY","display_order":2,"check":{"kind":"SHORTEST","target":"a"},"expected_answer":"Dải A"},
      {"code":"g1-len-q03","question_type":"MULTIPLE_CHOICE","prompt":"So sánh độ dài của dải A và dải B.","options":{"A":"A dài hơn B","B":"A ngắn hơn B","C":"A dài bằng B","D":"Không thể so sánh"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Hai dải A và B có cùng điểm bắt đầu và có điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":15,"y":32,"length":40,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":66,"length":40,"pattern":"DASHED"}]},"skill_code":"COMPARE_LENGTHS","difficulty":"EASY","display_order":3,"check":{"kind":"RELATION_EQUAL","targets":["a","b"]},"expected_answer":"A dài bằng B"},
      {"code":"g1-len-q04","question_type":"MULTIPLE_CHOICE","prompt":"Ba dải cùng điểm đầu. Dải nào dài nhất?","options":{"A":"Dải A","B":"Dải B","C":"Dải C","D":"Ba dải bằng nhau"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Ba dải A, B, C có cùng điểm bắt đầu và ba điểm kết thúc riêng biệt.","items":[{"id":"a","label":"A","startX":15,"y":22,"length":25,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":50,"length":55,"pattern":"DASHED"},{"id":"c","label":"C","startX":15,"y":78,"length":40,"pattern":"DOUBLE"}]},"skill_code":"COMPARE_LENGTHS","difficulty":"EASY","display_order":4,"check":{"kind":"LONGEST","target":"b"},"expected_answer":"Dải B"},
      {"code":"g1-len-q05","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu dải dài hơn dải A?","options":null,"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Bốn dải A, B, C, D có cùng điểm bắt đầu và các điểm kết thúc rõ ràng.","items":[{"id":"a","label":"A","startX":10,"y":16,"length":30,"pattern":"SOLID"},{"id":"b","label":"B","startX":10,"y":38,"length":45,"pattern":"DASHED"},{"id":"c","label":"C","startX":10,"y":60,"length":55,"pattern":"DOUBLE"},{"id":"d","label":"D","startX":10,"y":82,"length":60,"pattern":"SOLID"}]},"skill_code":"COMPARE_LENGTHS","difficulty":"MEDIUM","display_order":5,"check":{"kind":"COUNT_LONGER_THAN","reference":"a","count":3},"expected_answer":3},
      {"code":"g1-len-q06","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu dải dài bằng dải A, kể cả dải A?","options":null,"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Bốn dải A, B, C, D có cùng điểm bắt đầu; mỗi dải có điểm cuối được đánh dấu.","items":[{"id":"a","label":"A","startX":10,"y":16,"length":32,"pattern":"SOLID"},{"id":"b","label":"B","startX":10,"y":38,"length":50,"pattern":"DASHED"},{"id":"c","label":"C","startX":10,"y":60,"length":32,"pattern":"DOUBLE"},{"id":"d","label":"D","startX":10,"y":82,"length":60,"pattern":"SOLID"}]},"skill_code":"COMPARE_LENGTHS","difficulty":"MEDIUM","display_order":6,"check":{"kind":"COUNT_EQUAL_TO","reference":"a","count":2},"expected_answer":2},

      {"code":"g1-len-q07","question_type":"MULTIPLE_CHOICE","prompt":"Chọn thứ tự các dải từ ngắn đến dài.","options":{"A":"A, B, C","B":"C, B, A","C":"B, A, C","D":"A, C, B"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Ba dải A, B, C có cùng điểm bắt đầu và ba điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":15,"y":22,"length":20,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":50,"length":40,"pattern":"DASHED"},{"id":"c","label":"C","startX":15,"y":78,"length":60,"pattern":"DOUBLE"}]},"skill_code":"ORDER_BY_LENGTH","difficulty":"EASY","display_order":7,"check":{"kind":"ORDER_ASC","targets":["a","b","c"]},"expected_answer":"A, B, C"},
      {"code":"g1-len-q08","question_type":"MULTIPLE_CHOICE","prompt":"Chọn thứ tự các dải từ dài đến ngắn.","options":{"A":"C, B, A","B":"A, B, C","C":"B, A, C","D":"A, C, B"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Ba dải A, B, C có cùng điểm bắt đầu và ba điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":15,"y":22,"length":65,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":50,"length":45,"pattern":"DASHED"},{"id":"c","label":"C","startX":15,"y":78,"length":25,"pattern":"DOUBLE"}]},"skill_code":"ORDER_BY_LENGTH","difficulty":"EASY","display_order":8,"check":{"kind":"ORDER_DESC","targets":["a","b","c"]},"expected_answer":"A, B, C"},
      {"code":"g1-len-q09","question_type":"MULTIPLE_CHOICE","prompt":"Dải nào có độ dài ở giữa hai dải còn lại?","options":{"A":"Dải A","B":"Dải B","C":"Dải C","D":"Không có dải nào"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Ba dải A, B, C có cùng điểm bắt đầu và ba độ dài khác nhau.","items":[{"id":"a","label":"A","startX":15,"y":22,"length":35,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":50,"length":55,"pattern":"DASHED"},{"id":"c","label":"C","startX":15,"y":78,"length":20,"pattern":"DOUBLE"}]},"skill_code":"ORDER_BY_LENGTH","difficulty":"MEDIUM","display_order":9,"check":{"kind":"MIDDLE","target":"a"},"expected_answer":"Dải A"},
      {"code":"g1-len-q10","question_type":"MULTIPLE_CHOICE","prompt":"Chọn thứ tự đúng từ ngắn đến dài.","options":{"A":"A, B, C","B":"C, A, B","C":"B, C, A","D":"B, A, C"},"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Ba dải A, B, C có cùng điểm bắt đầu và ba điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":15,"y":22,"length":50,"pattern":"SOLID"},{"id":"b","label":"B","startX":15,"y":50,"length":25,"pattern":"DASHED"},{"id":"c","label":"C","startX":15,"y":78,"length":40,"pattern":"DOUBLE"}]},"skill_code":"ORDER_BY_LENGTH","difficulty":"EASY","display_order":10,"check":{"kind":"ORDER_ASC","targets":["b","c","a"]},"expected_answer":"B, C, A"},
      {"code":"g1-len-q11","question_type":"NUMBER_INPUT","prompt":"Khi xếp từ ngắn đến dài, dải B đứng thứ mấy?","options":null,"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Bốn dải A, B, C, D có cùng điểm bắt đầu và các điểm kết thúc được đánh dấu rõ ràng.","items":[{"id":"a","label":"A","startX":10,"y":16,"length":20,"pattern":"SOLID"},{"id":"b","label":"B","startX":10,"y":38,"length":35,"pattern":"DASHED"},{"id":"c","label":"C","startX":10,"y":60,"length":50,"pattern":"DOUBLE"},{"id":"d","label":"D","startX":10,"y":82,"length":65,"pattern":"SOLID"}]},"skill_code":"ORDER_BY_LENGTH","difficulty":"MEDIUM","display_order":11,"check":{"kind":"POSITION_ASC","target":"b","position":2},"expected_answer":2},
      {"code":"g1-len-q12","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu dải ngắn hơn dải C?","options":null,"visual_spec":{"kind":"LENGTH_COMPARISON","description":"Bốn dải A, B, C, D có cùng điểm bắt đầu và các điểm kết thúc riêng biệt.","items":[{"id":"a","label":"A","startX":10,"y":16,"length":60,"pattern":"SOLID"},{"id":"b","label":"B","startX":10,"y":38,"length":25,"pattern":"DASHED"},{"id":"c","label":"C","startX":10,"y":60,"length":45,"pattern":"DOUBLE"},{"id":"d","label":"D","startX":10,"y":82,"length":30,"pattern":"SOLID"}]},"skill_code":"ORDER_BY_LENGTH","difficulty":"MEDIUM","display_order":12,"check":{"kind":"COUNT_SHORTER_THAN","reference":"c","count":2},"expected_answer":2},

      {"code":"g1-len-q13","question_type":"MULTIPLE_CHOICE","prompt":"Vật được phủ bởi bao nhiêu ô bằng nhau?","options":{"A":"4","B":"5","C":"6","D":"7"},"visual_spec":{"kind":"EQUAL_UNIT_MEASUREMENT","description":"Một dải giấy nằm trên một hàng ô bằng nhau, đặt liên tiếp và phủ từ đầu đến cuối dải.","objectLabel":"Dải giấy","unitLabel":"ô","startX":10,"endX":70,"y":38,"unitWidth":12},"skill_code":"MEASURE_WITH_EQUAL_UNITS","difficulty":"EASY","display_order":13,"check":{"kind":"MEASURE_EQUAL_UNITS","count":5},"expected_answer":5},
      {"code":"g1-len-q14","question_type":"MULTIPLE_CHOICE","prompt":"Chiếc bút dài bằng bao nhiêu que đơn vị?","options":{"A":"5","B":"6","C":"7","D":"8"},"visual_spec":{"kind":"EQUAL_UNIT_MEASUREMENT","description":"Chiếc bút nằm trên một hàng que đơn vị bằng nhau, không chồng và không có khoảng trống.","objectLabel":"Chiếc bút","unitLabel":"que","startX":10,"endX":80,"y":38,"unitWidth":10},"skill_code":"MEASURE_WITH_EQUAL_UNITS","difficulty":"EASY","display_order":14,"check":{"kind":"MEASURE_EQUAL_UNITS","count":7},"expected_answer":7},
      {"code":"g1-len-q15","question_type":"MULTIPLE_CHOICE","prompt":"Sợi dây dài bằng bao nhiêu đoạn bằng nhau?","options":{"A":"4","B":"5","C":"6","D":"7"},"visual_spec":{"kind":"EQUAL_UNIT_MEASUREMENT","description":"Sợi dây nằm trên các đoạn đơn vị bằng nhau, đặt liền nhau từ đầu đến cuối.","objectLabel":"Sợi dây","unitLabel":"đoạn","startX":10,"endX":66,"y":38,"unitWidth":14},"skill_code":"MEASURE_WITH_EQUAL_UNITS","difficulty":"EASY","display_order":15,"check":{"kind":"MEASURE_EQUAL_UNITS","count":4},"expected_answer":4},
      {"code":"g1-len-q16","question_type":"MULTIPLE_CHOICE","prompt":"Thanh gỗ dài bằng bao nhiêu khối đơn vị?","options":{"A":"5","B":"6","C":"7","D":"8"},"visual_spec":{"kind":"EQUAL_UNIT_MEASUREMENT","description":"Thanh gỗ nằm trên một hàng khối đơn vị bằng nhau, đặt sát nhau từ đầu đến cuối.","objectLabel":"Thanh gỗ","unitLabel":"khối","startX":10,"endX":82,"y":38,"unitWidth":9},"skill_code":"MEASURE_WITH_EQUAL_UNITS","difficulty":"MEDIUM","display_order":16,"check":{"kind":"MEASURE_EQUAL_UNITS","count":8},"expected_answer":8},
      {"code":"g1-len-q17","question_type":"NUMBER_INPUT","prompt":"Quyển sách dài bằng bao nhiêu ô đơn vị?","options":null,"visual_spec":{"kind":"EQUAL_UNIT_MEASUREMENT","description":"Quyển sách nằm trên một hàng ô đơn vị bằng nhau, đặt liên tiếp từ đầu đến cuối.","objectLabel":"Quyển sách","unitLabel":"ô","startX":10,"endX":76,"y":38,"unitWidth":11},"skill_code":"MEASURE_WITH_EQUAL_UNITS","difficulty":"EASY","display_order":17,"check":{"kind":"MEASURE_EQUAL_UNITS","count":6},"expected_answer":6},
      {"code":"g1-len-q18","question_type":"NUMBER_INPUT","prompt":"Dải ruy-băng dài bằng bao nhiêu đoạn đơn vị?","options":null,"visual_spec":{"kind":"EQUAL_UNIT_MEASUREMENT","description":"Dải ruy-băng nằm trên các đoạn đơn vị bằng nhau, đặt liên tiếp và không có khoảng trống.","objectLabel":"Ruy-băng","unitLabel":"đoạn","startX":10,"endX":82,"y":38,"unitWidth":8},"skill_code":"MEASURE_WITH_EQUAL_UNITS","difficulty":"MEDIUM","display_order":18,"check":{"kind":"MEASURE_EQUAL_UNITS","count":9},"expected_answer":9},

      {"code":"g1-len-q19","question_type":"MULTIPLE_CHOICE","prompt":"Dải giấy dài bao nhiêu xăng-ti-mét?","options":{"A":"3 cm","B":"4 cm","C":"5 cm","D":"6 cm"},"visual_spec":{"kind":"SIMPLE_RULER","description":"Dải giấy đặt thẳng, một đầu tại vạch 0 và đầu còn lại trùng một vạch trên thước xăng-ti-mét.","objectLabel":"Dải giấy","unitLabel":"cm","startValue":0,"endValue":3,"maxValue":10},"skill_code":"READ_SIMPLE_MEASUREMENT","difficulty":"EASY","display_order":19,"check":{"kind":"READ_RULER","value":3},"expected_answer":"3 cm"},
      {"code":"g1-len-q20","question_type":"MULTIPLE_CHOICE","prompt":"Chiếc bút dài bao nhiêu xăng-ti-mét?","options":{"A":"4 cm","B":"5 cm","C":"6 cm","D":"7 cm"},"visual_spec":{"kind":"SIMPLE_RULER","description":"Chiếc bút đặt thẳng, một đầu tại vạch 0 và đầu còn lại trùng một vạch trên thước xăng-ti-mét.","objectLabel":"Chiếc bút","unitLabel":"cm","startValue":0,"endValue":5,"maxValue":10},"skill_code":"READ_SIMPLE_MEASUREMENT","difficulty":"EASY","display_order":20,"check":{"kind":"READ_RULER","value":5},"expected_answer":"5 cm"},
      {"code":"g1-len-q21","question_type":"MULTIPLE_CHOICE","prompt":"Sợi dây dài bao nhiêu xăng-ti-mét?","options":{"A":"5 cm","B":"6 cm","C":"7 cm","D":"8 cm"},"visual_spec":{"kind":"SIMPLE_RULER","description":"Sợi dây đặt thẳng, một đầu tại vạch 0 và đầu còn lại trùng một vạch trên thước xăng-ti-mét.","objectLabel":"Sợi dây","unitLabel":"cm","startValue":0,"endValue":7,"maxValue":10},"skill_code":"READ_SIMPLE_MEASUREMENT","difficulty":"EASY","display_order":21,"check":{"kind":"READ_RULER","value":7},"expected_answer":"7 cm"},
      {"code":"g1-len-q22","question_type":"MULTIPLE_CHOICE","prompt":"Thanh gỗ dài bao nhiêu xăng-ti-mét?","options":{"A":"5 cm","B":"6 cm","C":"7 cm","D":"8 cm"},"visual_spec":{"kind":"SIMPLE_RULER","description":"Thanh gỗ đặt thẳng, một đầu tại vạch 0 và đầu còn lại trùng một vạch trên thước xăng-ti-mét.","objectLabel":"Thanh gỗ","unitLabel":"cm","startValue":0,"endValue":8,"maxValue":10},"skill_code":"READ_SIMPLE_MEASUREMENT","difficulty":"MEDIUM","display_order":22,"check":{"kind":"READ_RULER","value":8},"expected_answer":"8 cm"},
      {"code":"g1-len-q23","question_type":"NUMBER_INPUT","prompt":"Dải bìa dài bao nhiêu xăng-ti-mét? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SIMPLE_RULER","description":"Dải bìa đặt thẳng, một đầu tại vạch 0 và đầu còn lại trùng một vạch trên thước xăng-ti-mét.","objectLabel":"Dải bìa","unitLabel":"cm","startValue":0,"endValue":6,"maxValue":10},"skill_code":"READ_SIMPLE_MEASUREMENT","difficulty":"EASY","display_order":23,"check":{"kind":"READ_RULER","value":6},"expected_answer":6},
      {"code":"g1-len-q24","question_type":"NUMBER_INPUT","prompt":"Sợi len dài bao nhiêu xăng-ti-mét? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SIMPLE_RULER","description":"Sợi len đặt thẳng, một đầu tại vạch 0 và đầu còn lại trùng một vạch trên thước xăng-ti-mét.","objectLabel":"Sợi len","unitLabel":"cm","startValue":0,"endValue":9,"maxValue":10},"skill_code":"READ_SIMPLE_MEASUREMENT","difficulty":"MEDIUM","display_order":24,"check":{"kind":"READ_RULER","value":9},"expected_answer":9}
    ]$questions$::jsonb
  ) as item(
    code text,
    question_type text,
    prompt text,
    options jsonb,
    visual_spec jsonb,
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
  visual_spec,
  skill_code,
  difficulty,
  display_order,
  published
)
select
  seed.code,
  'grade-1-length-measurement',
  seed.question_type,
  seed.prompt,
  seed.options,
  seed.visual_spec,
  seed.skill_code,
  seed.difficulty,
  seed.display_order,
  true
from question_seed as seed
on conflict (code) do nothing;

with solution_seed as (
  select *
  from pg_catalog.jsonb_to_recordset(
    $solutions$[
      {"question_id":"g1-len-q01","correct_answer":"A","solution_steps":["Hai dải cùng bắt đầu tại một điểm nên có thể so sánh điểm cuối.","Điểm cuối của dải A xa hơn điểm cuối của dải B, nên dải A dài hơn."],"explanation":"Khi cùng điểm đầu, vật có điểm cuối xa hơn là vật dài hơn.","hint":"Hãy nhìn hai điểm cuối."},
      {"question_id":"g1-len-q02","correct_answer":"A","solution_steps":["Hai dải đã được đặt cùng điểm bắt đầu.","Dải A dừng sớm hơn dải B, nên dải A ngắn hơn."],"explanation":"Khi cùng điểm đầu, vật dừng sớm hơn là vật ngắn hơn.","hint":"Tìm dải có điểm cuối gần điểm đầu hơn."},
      {"question_id":"g1-len-q03","correct_answer":"C","solution_steps":["Dải A và dải B cùng bắt đầu tại một điểm.","Hai dải cũng kết thúc tại cùng một điểm, nên chúng dài bằng nhau."],"explanation":"Cùng điểm đầu và cùng điểm cuối cho thấy hai dải có cùng độ dài.","hint":"So sánh cả điểm đầu lẫn điểm cuối."},
      {"question_id":"g1-len-q04","correct_answer":"B","solution_steps":["Ba dải cùng điểm đầu nên ta so sánh các điểm cuối.","Dải B có điểm cuối xa nhất, vì vậy dải B dài nhất."],"explanation":"Dải vươn xa nhất từ cùng điểm đầu là dải dài nhất.","hint":"Tìm điểm cuối ở xa nhất."},
      {"question_id":"g1-len-q05","correct_answer":"3","solution_steps":["Lấy độ dài dải A làm mốc rồi quan sát điểm cuối của B, C và D.","Cả ba dải B, C, D đều vươn xa hơn dải A, nên có 3 dải."],"explanation":"Ba dải B, C, D dài hơn dải A.","hint":"Đếm các điểm cuối nằm xa hơn điểm cuối A."},
      {"question_id":"g1-len-q06","correct_answer":"2","solution_steps":["Tìm các dải có điểm đầu và điểm cuối trùng với dải A.","Dải A và dải C có cùng độ dài, nên có 2 dải kể cả A."],"explanation":"Hai dải A và C dài bằng nhau.","hint":"Đếm cả dải A như đề bài yêu cầu."},

      {"question_id":"g1-len-q07","correct_answer":"A","solution_steps":["So sánh ba điểm cuối khi các dải cùng điểm đầu: A dừng sớm nhất, rồi B, rồi C.","Vì vậy thứ tự từ ngắn đến dài là A, B, C."],"explanation":"Điểm cuối càng xa thì dải càng dài.","hint":"Bắt đầu từ dải dừng sớm nhất."},
      {"question_id":"g1-len-q08","correct_answer":"B","solution_steps":["Dải A có điểm cuối xa nhất, dải B đứng tiếp theo và dải C dừng sớm nhất.","Vì vậy thứ tự từ dài đến ngắn là A, B, C."],"explanation":"Sắp xếp các điểm cuối từ xa về gần.","hint":"Bắt đầu từ dải vươn xa nhất."},
      {"question_id":"g1-len-q09","correct_answer":"A","solution_steps":["Dải C ngắn nhất và dải B dài nhất.","Dải A dài hơn C nhưng ngắn hơn B, nên A có độ dài ở giữa."],"explanation":"Dải A nằm giữa hai độ dài còn lại.","hint":"Loại dải ngắn nhất và dài nhất."},
      {"question_id":"g1-len-q10","correct_answer":"C","solution_steps":["Dải B dừng sớm nhất, dải C dừng sau B và dải A vươn xa nhất.","Thứ tự từ ngắn đến dài là B, C, A."],"explanation":"Các điểm cuối được xếp từ gần đến xa.","hint":"Tìm dải ngắn nhất trước."},
      {"question_id":"g1-len-q11","correct_answer":"2","solution_steps":["Thứ tự từ ngắn đến dài là A, B, C, D.","Dải B đứng sau A nên ở vị trí thứ 2."],"explanation":"Dải B là dải ngắn thứ hai.","hint":"Đếm vị trí từ dải ngắn nhất."},
      {"question_id":"g1-len-q12","correct_answer":"2","solution_steps":["Lấy điểm cuối của dải C làm mốc.","Dải B và dải D dừng trước C, nên có 2 dải ngắn hơn C."],"explanation":"Hai dải B và D ngắn hơn dải C.","hint":"Không đếm dải A vì A dài hơn C."},

      {"question_id":"g1-len-q13","correct_answer":"B","solution_steps":["Các ô bằng nhau được đặt liên tiếp từ đầu đến cuối dải giấy.","Đếm lần lượt được 5 ô, nên dải giấy dài bằng 5 ô."],"explanation":"Số đo bằng số đơn vị bằng nhau phủ hết vật.","hint":"Đếm mỗi ô đúng một lần."},
      {"question_id":"g1-len-q14","correct_answer":"C","solution_steps":["Các que có cùng độ dài và được đặt liền nhau dưới chiếc bút.","Đếm từ đầu đến cuối được 7 que đơn vị."],"explanation":"Chiếc bút được phủ bởi 7 que bằng nhau.","hint":"Đếm các que theo thứ tự."},
      {"question_id":"g1-len-q15","correct_answer":"A","solution_steps":["Các đoạn bằng nhau phủ kín chiều dài sợi dây, không có khoảng trống.","Đếm được 4 đoạn, nên sợi dây dài bằng 4 đoạn."],"explanation":"Bốn đoạn bằng nhau phủ hết sợi dây.","hint":"Đếm các đường chia đơn vị."},
      {"question_id":"g1-len-q16","correct_answer":"D","solution_steps":["Các khối đơn vị bằng nhau được đặt sát nhau từ đầu đến cuối thanh gỗ.","Đếm lần lượt được 8 khối đơn vị."],"explanation":"Thanh gỗ dài bằng 8 khối đơn vị.","hint":"Không bỏ sót khối ở hai đầu."},
      {"question_id":"g1-len-q17","correct_answer":"6","solution_steps":["Các ô đơn vị có cùng kích thước và phủ kín chiều dài quyển sách.","Đếm được 6 ô, nên đáp án là 6."],"explanation":"Quyển sách dài bằng 6 ô đơn vị.","hint":"Đếm từ trái sang phải."},
      {"question_id":"g1-len-q18","correct_answer":"9","solution_steps":["Các đoạn đơn vị bằng nhau được đặt liên tiếp dưới dải ruy-băng.","Đếm đủ từ đầu đến cuối được 9 đoạn."],"explanation":"Dải ruy-băng dài bằng 9 đoạn đơn vị.","hint":"Mỗi đoạn chỉ được đếm một lần."},

      {"question_id":"g1-len-q19","correct_answer":"A","solution_steps":["Một đầu dải giấy được đặt đúng tại vạch 0.","Đầu còn lại trùng vạch 3, nên dải giấy dài 3 cm."],"explanation":"Vật bắt đầu ở 0 và kết thúc ở 3 nên có độ dài 3 cm.","hint":"Đọc vạch ở đầu còn lại của dải giấy."},
      {"question_id":"g1-len-q20","correct_answer":"B","solution_steps":["Một đầu chiếc bút trùng vạch 0 trên thước.","Đầu còn lại trùng vạch 5, nên chiếc bút dài 5 cm."],"explanation":"Số tại vạch kết thúc là số đo theo cm khi vật bắt đầu tại 0.","hint":"Tìm vạch trùng với đầu bên phải."},
      {"question_id":"g1-len-q21","correct_answer":"C","solution_steps":["Sợi dây được đặt từ vạch 0 và nằm thẳng theo thước.","Đầu còn lại trùng vạch 7, nên sợi dây dài 7 cm."],"explanation":"Khoảng từ vạch 0 đến vạch 7 dài 7 cm.","hint":"Đọc số ở điểm cuối sợi dây."},
      {"question_id":"g1-len-q22","correct_answer":"D","solution_steps":["Thanh gỗ bắt đầu đúng tại vạch 0.","Đầu còn lại trùng vạch 8, nên thanh gỗ dài 8 cm."],"explanation":"Vạch kết thúc cho biết số đo 8 cm.","hint":"Kiểm tra cả vạch đầu và vạch cuối."},
      {"question_id":"g1-len-q23","correct_answer":"6","solution_steps":["Dải bìa bắt đầu tại vạch 0 trên thước.","Đầu còn lại trùng vạch 6, nên chỉ nhập số 6."],"explanation":"Dải bìa dài 6 cm.","hint":"Nhập số ở vạch kết thúc."},
      {"question_id":"g1-len-q24","correct_answer":"9","solution_steps":["Sợi len được đặt từ vạch 0 và không bị cong.","Đầu còn lại trùng vạch 9, nên chỉ nhập số 9."],"explanation":"Sợi len dài 9 cm.","hint":"Đọc vạch ở đầu cuối sợi len."}
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
  v_unit_count bigint;
  v_question_count bigint;
  v_solution_count bigint;
  v_mcq_count bigint;
  v_number_count bigint;
  v_invalid_count bigint;
  v_constraint_definition text;
  v_start_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  join public.learning_units as prerequisite
    on prerequisite.slug = unit.prerequisite_unit_slug
  where unit.slug = 'grade-1-length-measurement'
    and unit.grade = 1
    and unit.title = 'Đo độ dài và so sánh độ dài'
    and unit.published
    and unit.total_questions = 24
    and unit.display_order = 11
    and unit.prerequisite_unit_slug = 'grade-1-basic-geometry-and-position'
    and prerequisite.grade = 1
    and prerequisite.published
    and prerequisite.display_order = 10;

  select
    count(*),
    count(*) filter (where question_type = 'MULTIPLE_CHOICE'),
    count(*) filter (where question_type = 'NUMBER_INPUT')
  into v_question_count, v_mcq_count, v_number_count
  from public.questions
  where unit_slug = 'grade-1-length-measurement';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-length-measurement';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
  then
    raise exception 'Grade 1 length content count validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from (
    select question.skill_code
    from public.questions as question
    where question.unit_slug = 'grade-1-length-measurement'
    group by question.skill_code
    having count(*) <> 6
  ) as invalid_skill;

  if
    v_invalid_count <> 0
    or (
      select count(distinct question.skill_code)
      from public.questions as question
      where question.unit_slug = 'grade-1-length-measurement'
        and question.skill_code in (
          'COMPARE_LENGTHS',
          'ORDER_BY_LENGTH',
          'MEASURE_WITH_EQUAL_UNITS',
          'READ_SIMPLE_MEASUREMENT'
        )
    ) <> 4
  then
    raise exception 'Grade 1 length skill distribution validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  where question.unit_slug = 'grade-1-length-measurement'
    and (
      not question.published
      or question.visual_spec is null
      or not private.is_valid_practice_visual_spec(question.visual_spec)
      or question.display_order not between 1 and 24
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 length visual validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-length-measurement'
    and (
      pg_catalog.jsonb_typeof(solution.solution_steps) <> 'array'
      or pg_catalog.jsonb_array_length(solution.solution_steps) < 2
      or btrim(solution.explanation) = ''
      or btrim(solution.hint) = ''
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 length solution validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-length-measurement'
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

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 length multiple-choice validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-length-measurement'
    and question.question_type = 'NUMBER_INPUT'
    and (
      question.options is not null
      or solution.correct_answer !~ '^(0|[1-9][0-9]?)$'
      or solution.correct_answer::integer not between 0 and 100
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 length number-input validation failed';
  end if;

  if (
    select count(*)
    from (
      select question.code
      from public.questions as question
      where question.unit_slug = 'grade-1-length-measurement'
      group by question.code
      having count(*) > 1
    ) as duplicate_code
  ) <> 0
  or (
    select count(*)
    from (
      select question.prompt
      from public.questions as question
      where question.unit_slug = 'grade-1-length-measurement'
      group by question.prompt
      having count(*) > 1
    ) as duplicate_prompt
  ) <> 0
  then
    raise exception 'Grade 1 length uniqueness validation failed';
  end if;

  select pg_catalog.pg_get_constraintdef(constraint_row.oid)
  into v_constraint_definition
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.questions'::pg_catalog.regclass
    and constraint_row.conname = 'questions_visual_spec_check';

  select pg_catalog.pg_get_functiondef(procedure_row.oid)
  into v_start_definition
  from pg_catalog.pg_proc as procedure_row
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = procedure_row.pronamespace
  where namespace_row.nspname = 'public'
    and procedure_row.proname = 'start_or_resume_practice'
    and pg_catalog.pg_get_function_identity_arguments(procedure_row.oid)
      = 'p_unit_slug text';

  if
    v_constraint_definition is null
    or v_constraint_definition !~ 'is_valid_practice_visual_spec'
    or v_start_definition is null
    or v_start_definition !~ 'auth[.]uid'
    or v_start_definition !~ 'prerequisite_unit_slug'
    or v_start_definition !~ 'COMPLETED'
  then
    raise exception 'Practice authorization validation failed';
  end if;

  if
    has_table_privilege('anon', 'public.question_solutions', 'SELECT')
    or has_table_privilege(
      'authenticated',
      'public.question_solutions',
      'SELECT'
    )
    or has_table_privilege('anon', 'public.practice_attempts', 'INSERT')
    or has_table_privilege(
      'authenticated',
      'public.practice_attempts',
      'INSERT'
    )
    or has_table_privilege('anon', 'public.practice_answers', 'INSERT')
    or has_table_privilege(
      'authenticated',
      'public.practice_answers',
      'INSERT'
    )
  then
    raise exception 'Practice privilege validation failed';
  end if;
end;
$validation$;

commit;
