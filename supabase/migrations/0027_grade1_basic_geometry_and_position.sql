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
  v_x integer;
  v_y integer;
  v_width integer;
  v_height integer;
begin
  if
    pg_catalog.jsonb_typeof(p_spec) <> 'object'
    or p_spec ->> 'kind' <> 'SHAPE_SCENE'
    or not (p_spec ?& array['kind', 'description', 'items'])
    or (
      select count(*)
      from pg_catalog.jsonb_object_keys(p_spec)
    ) <> 3
    or pg_catalog.jsonb_typeof(p_spec -> 'description') <> 'string'
    or char_length(btrim(p_spec ->> 'description')) not between 12 and 240
    or btrim(p_spec ->> 'description') <> p_spec ->> 'description'
    or lower(p_spec ->> 'description')
      ~ '(https?:|www[.]|javascript:|data:|<|>)'
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
exception
  when others then
    return false;
end;
$$;

alter table public.questions
add column visual_spec jsonb null;

alter table public.questions
add constraint questions_visual_spec_check
check (
  visual_spec is null
  or private.is_valid_practice_visual_spec(visual_spec)
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
    'COUNT_SHAPES_IN_PICTURE'
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
  'grade-1-basic-geometry-and-position',
  1,
  'Hình học và vị trí cơ bản',
  'Nhận biết, phân loại và đếm các hình cơ bản; mô tả vị trí bằng những từ quen thuộc.',
  $objectives$[
    "Nhận biết được hình tròn, hình tam giác, hình vuông và hình chữ nhật.",
    "So sánh và phân loại được các hình theo đặc điểm quan sát.",
    "Dùng đúng các từ trái, phải, trên, dưới, trước, sau và ở giữa.",
    "Đếm đúng các hình trong một minh họa đơn giản."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "circle-familiar-objects",
        "title": "Hình tròn và đồ vật quen thuộc",
        "paragraphs": [
          "Hình tròn có đường bao cong khép kín và không có cạnh thẳng hay góc.",
          "Mặt đồng hồ hoặc chiếc đĩa nhìn từ phía trước thường gợi cho ta hình tròn."
        ]
      },
      {
        "code": "triangle",
        "title": "Hình tam giác",
        "paragraphs": [
          "Hình tam giác có ba cạnh thẳng và ba góc.",
          "Ta quan sát đường bao của hình để nhận biết, không cần dựa vào màu sắc."
        ]
      },
      {
        "code": "square-and-rectangle",
        "title": "Hình vuông và hình chữ nhật",
        "paragraphs": [
          "Hình vuông có bốn cạnh bằng nhau. Hình chữ nhật cũng có bốn cạnh nhưng thường có hai cạnh dài và hai cạnh ngắn.",
          "Hai hình có thể xoay theo hướng khác nhau nhưng đặc điểm về cạnh vẫn không đổi."
        ]
      },
      {
        "code": "compare-and-sort",
        "title": "So sánh và phân loại hình",
        "paragraphs": [
          "Ta có thể xếp các hình cùng loại vào một nhóm bằng cách quan sát số cạnh và đặc điểm đường bao.",
          "Hình tròn không có cạnh thẳng; hình tam giác có ba cạnh; hình vuông và hình chữ nhật có bốn cạnh."
        ]
      },
      {
        "code": "position-words",
        "title": "Các từ chỉ vị trí",
        "paragraphs": [
          "Trái và phải mô tả vị trí theo chiều ngang; trên và dưới mô tả vị trí theo chiều dọc.",
          "Một vật có thể ở giữa hai vật khác. Vật che một phần vật khác được nhìn là ở phía trước."
        ]
      },
      {
        "code": "count-shapes",
        "title": "Đếm hình trong một hình minh họa",
        "paragraphs": [
          "Chọn một loại hình cần đếm, chỉ lần lượt từng hình rồi ghi lại số lượng.",
          "Sau khi đếm, ta kiểm tra lại từ trái sang phải để không bỏ sót hoặc đếm lặp."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Nhận biết và phân loại bốn hình",
        "steps": [
          "Quan sát đường bao: hình tròn không có cạnh thẳng, hình tam giác có ba cạnh.",
          "Quan sát các hình có bốn cạnh: hình vuông có bốn cạnh bằng nhau, hình chữ nhật có hai cạnh dài và hai cạnh ngắn.",
          "Xếp mỗi hình vào đúng nhóm theo đặc điểm vừa quan sát."
        ],
        "answer": "Bốn nhóm là hình tròn, hình tam giác, hình vuông và hình chữ nhật."
      },
      {
        "title": "Tìm hình ở giữa",
        "steps": [
          "Quan sát ba hình theo thứ tự từ trái sang phải.",
          "Hình thứ hai có một hình ở bên trái và một hình ở bên phải.",
          "Vì vậy hình thứ hai nằm ở giữa hai hình còn lại."
        ],
        "answer": "Hình thứ hai là hình ở giữa."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  10,
  'grade-1-subtraction-within-100-no-borrow'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from jsonb_to_recordset(
    $questions$[
      {"code":"g1-geo-q01","question_type":"MULTIPLE_CHOICE","prompt":"Hình A trong minh họa là hình gì?","options":{"A":"Hình tròn","B":"Hình tam giác","C":"Hình vuông","D":"Hình chữ nhật"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình có nhãn A, B, C, D theo thứ tự: hình tròn, hình vuông, hình tam giác và hình chữ nhật.","items":[{"id":"a","shape":"CIRCLE","x":4,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"SQUARE","x":29,"y":35,"width":18,"height":18,"label":"B"},{"id":"c","shape":"TRIANGLE","x":54,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"RECTANGLE","x":77,"y":36,"width":22,"height":16,"label":"D"}]},"skill_code":"RECOGNIZE_BASIC_SHAPES","difficulty":"EASY","display_order":1,"check":{"kind":"ITEM_SHAPE","target":"a","shape":"CIRCLE"},"expected_answer":"Hình tròn"},
      {"code":"g1-geo-q02","question_type":"MULTIPLE_CHOICE","prompt":"Hình B trong minh họa có ba cạnh. Đó là hình gì?","options":{"A":"Hình tròn","B":"Hình tam giác","C":"Hình vuông","D":"Hình chữ nhật"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình có nhãn A, B, C, D theo thứ tự: hình vuông, hình tam giác, hình tròn và hình chữ nhật.","items":[{"id":"a","shape":"SQUARE","x":4,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"TRIANGLE","x":29,"y":35,"width":18,"height":18,"label":"B"},{"id":"c","shape":"CIRCLE","x":54,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"RECTANGLE","x":77,"y":36,"width":22,"height":16,"label":"D"}]},"skill_code":"RECOGNIZE_BASIC_SHAPES","difficulty":"EASY","display_order":2,"check":{"kind":"ITEM_SHAPE","target":"b","shape":"TRIANGLE"},"expected_answer":"Hình tam giác"},
      {"code":"g1-geo-q03","question_type":"MULTIPLE_CHOICE","prompt":"Hình C có bốn cạnh bằng nhau. Hình C là hình gì?","options":{"A":"Hình tròn","B":"Hình tam giác","C":"Hình vuông","D":"Hình chữ nhật"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình có nhãn A, B, C, D theo thứ tự: hình tròn, hình tam giác, hình vuông và hình chữ nhật.","items":[{"id":"a","shape":"CIRCLE","x":4,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"TRIANGLE","x":29,"y":35,"width":18,"height":18,"label":"B"},{"id":"c","shape":"SQUARE","x":54,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"RECTANGLE","x":77,"y":36,"width":22,"height":16,"label":"D"}]},"skill_code":"RECOGNIZE_BASIC_SHAPES","difficulty":"EASY","display_order":3,"check":{"kind":"ITEM_SHAPE","target":"c","shape":"SQUARE"},"expected_answer":"Hình vuông"},
      {"code":"g1-geo-q04","question_type":"MULTIPLE_CHOICE","prompt":"Hình D có hai cạnh dài và hai cạnh ngắn. Hình D là hình gì?","options":{"A":"Hình tròn","B":"Hình tam giác","C":"Hình vuông","D":"Hình chữ nhật"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình có nhãn A, B, C, D theo thứ tự: hình tam giác, hình tròn, hình vuông và hình chữ nhật.","items":[{"id":"a","shape":"TRIANGLE","x":4,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"CIRCLE","x":29,"y":35,"width":18,"height":18,"label":"B"},{"id":"c","shape":"SQUARE","x":54,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"RECTANGLE","x":77,"y":36,"width":22,"height":16,"label":"D"}]},"skill_code":"RECOGNIZE_BASIC_SHAPES","difficulty":"EASY","display_order":4,"check":{"kind":"ITEM_SHAPE","target":"d","shape":"RECTANGLE"},"expected_answer":"Hình chữ nhật"},
      {"code":"g1-geo-q05","question_type":"NUMBER_INPUT","prompt":"Trong minh họa có bao nhiêu hình tròn?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Năm hình có nhãn A đến E gồm hai hình tròn, một hình vuông, một hình tam giác và một hình chữ nhật.","items":[{"id":"a","shape":"CIRCLE","x":3,"y":35,"width":16,"height":16,"label":"A"},{"id":"b","shape":"SQUARE","x":23,"y":35,"width":16,"height":16,"label":"B"},{"id":"c","shape":"CIRCLE","x":43,"y":35,"width":16,"height":16,"label":"C"},{"id":"d","shape":"TRIANGLE","x":63,"y":35,"width":16,"height":16,"label":"D"},{"id":"e","shape":"RECTANGLE","x":82,"y":36,"width":18,"height":14,"label":"E"}]},"skill_code":"RECOGNIZE_BASIC_SHAPES","difficulty":"EASY","display_order":5,"check":{"kind":"COUNT_SHAPE","shape":"CIRCLE","count":2},"expected_answer":2},
      {"code":"g1-geo-q06","question_type":"NUMBER_INPUT","prompt":"Trong minh họa có bao nhiêu hình tam giác?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Sáu hình có nhãn A đến F gồm ba hình tam giác, một hình tròn, một hình vuông và một hình chữ nhật.","items":[{"id":"a","shape":"TRIANGLE","x":2,"y":35,"width":14,"height":14,"label":"A"},{"id":"b","shape":"CIRCLE","x":18,"y":35,"width":14,"height":14,"label":"B"},{"id":"c","shape":"TRIANGLE","x":34,"y":35,"width":14,"height":14,"label":"C"},{"id":"d","shape":"SQUARE","x":50,"y":35,"width":14,"height":14,"label":"D"},{"id":"e","shape":"TRIANGLE","x":66,"y":35,"width":14,"height":14,"label":"E"},{"id":"f","shape":"RECTANGLE","x":82,"y":36,"width":18,"height":12,"label":"F"}]},"skill_code":"RECOGNIZE_BASIC_SHAPES","difficulty":"EASY","display_order":6,"check":{"kind":"COUNT_SHAPE","shape":"TRIANGLE","count":3},"expected_answer":3},

      {"code":"g1-geo-q07","question_type":"MULTIPLE_CHOICE","prompt":"Hai hình nào trong minh họa cùng là hình tròn?","options":{"A":"Hình A và hình B","B":"Hình A và hình C","C":"Hình B và hình D","D":"Hình C và hình D"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình A, B, C, D theo thứ tự là hình tròn, hình vuông, hình tròn và hình tam giác.","items":[{"id":"a","shape":"CIRCLE","x":5,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"SQUARE","x":30,"y":35,"width":18,"height":18,"label":"B"},{"id":"c","shape":"CIRCLE","x":55,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"TRIANGLE","x":80,"y":35,"width":18,"height":18,"label":"D"}]},"skill_code":"COMPARE_AND_SORT_SHAPES","difficulty":"EASY","display_order":7,"check":{"kind":"PAIR_SHAPE","targets":["a","c"],"shape":"CIRCLE"},"expected_answer":"Hình A và hình C"},
      {"code":"g1-geo-q08","question_type":"MULTIPLE_CHOICE","prompt":"Hai hình nào trong minh họa cùng là hình vuông?","options":{"A":"Hình A và hình B","B":"Hình B và hình C","C":"Hình A và hình D","D":"Hình C và hình D"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình A, B, C, D theo thứ tự là hình vuông, hình chữ nhật, hình tam giác và hình vuông.","items":[{"id":"a","shape":"SQUARE","x":5,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"RECTANGLE","x":29,"y":36,"width":22,"height":16,"label":"B"},{"id":"c","shape":"TRIANGLE","x":56,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"SQUARE","x":81,"y":35,"width":18,"height":18,"label":"D"}]},"skill_code":"COMPARE_AND_SORT_SHAPES","difficulty":"EASY","display_order":8,"check":{"kind":"PAIR_SHAPE","targets":["a","d"],"shape":"SQUARE"},"expected_answer":"Hình A và hình D"},
      {"code":"g1-geo-q09","question_type":"MULTIPLE_CHOICE","prompt":"Hình nào khác loại với ba hình còn lại?","options":{"A":"Hình A","B":"Hình B","C":"Hình C","D":"Hình D"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình A, B, C, D gồm ba hình tam giác tại A, B, D và một hình vuông tại C.","items":[{"id":"a","shape":"TRIANGLE","x":5,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"TRIANGLE","x":30,"y":35,"width":18,"height":18,"label":"B"},{"id":"c","shape":"SQUARE","x":55,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"TRIANGLE","x":80,"y":35,"width":18,"height":18,"label":"D"}]},"skill_code":"COMPARE_AND_SORT_SHAPES","difficulty":"MEDIUM","display_order":9,"check":{"kind":"ODD_SHAPE","target":"c"},"expected_answer":"Hình C"},
      {"code":"g1-geo-q10","question_type":"MULTIPLE_CHOICE","prompt":"Hai hình nào cùng có bốn cạnh bằng nhau?","options":{"A":"Hình A và hình B","B":"Hình A và hình C","C":"Hình B và hình D","D":"Hình C và hình D"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Bốn hình A, B, C, D theo thứ tự là hình vuông, hình chữ nhật, hình vuông và hình tròn.","items":[{"id":"a","shape":"SQUARE","x":5,"y":35,"width":18,"height":18,"label":"A"},{"id":"b","shape":"RECTANGLE","x":29,"y":36,"width":22,"height":16,"label":"B"},{"id":"c","shape":"SQUARE","x":56,"y":35,"width":18,"height":18,"label":"C"},{"id":"d","shape":"CIRCLE","x":81,"y":35,"width":18,"height":18,"label":"D"}]},"skill_code":"COMPARE_AND_SORT_SHAPES","difficulty":"MEDIUM","display_order":10,"check":{"kind":"PAIR_SHAPE","targets":["a","c"],"shape":"SQUARE"},"expected_answer":"Hình A và hình C"},
      {"code":"g1-geo-q11","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu hình có bốn cạnh bằng nhau?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Năm hình A đến E gồm hai hình vuông, một hình chữ nhật, một hình tam giác và một hình tròn.","items":[{"id":"a","shape":"SQUARE","x":3,"y":35,"width":16,"height":16,"label":"A"},{"id":"b","shape":"RECTANGLE","x":22,"y":36,"width":20,"height":14,"label":"B"},{"id":"c","shape":"SQUARE","x":45,"y":35,"width":16,"height":16,"label":"C"},{"id":"d","shape":"TRIANGLE","x":64,"y":35,"width":16,"height":16,"label":"D"},{"id":"e","shape":"CIRCLE","x":83,"y":35,"width":16,"height":16,"label":"E"}]},"skill_code":"COMPARE_AND_SORT_SHAPES","difficulty":"EASY","display_order":11,"check":{"kind":"COUNT_SHAPE","shape":"SQUARE","count":2},"expected_answer":2},
      {"code":"g1-geo-q12","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu hình không có cạnh thẳng?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Sáu hình A đến F gồm ba hình tròn, một hình vuông, một hình tam giác và một hình chữ nhật.","items":[{"id":"a","shape":"CIRCLE","x":2,"y":35,"width":14,"height":14,"label":"A"},{"id":"b","shape":"SQUARE","x":18,"y":35,"width":14,"height":14,"label":"B"},{"id":"c","shape":"CIRCLE","x":34,"y":35,"width":14,"height":14,"label":"C"},{"id":"d","shape":"TRIANGLE","x":50,"y":35,"width":14,"height":14,"label":"D"},{"id":"e","shape":"CIRCLE","x":66,"y":35,"width":14,"height":14,"label":"E"},{"id":"f","shape":"RECTANGLE","x":82,"y":36,"width":18,"height":12,"label":"F"}]},"skill_code":"COMPARE_AND_SORT_SHAPES","difficulty":"MEDIUM","display_order":12,"check":{"kind":"COUNT_SHAPE","shape":"CIRCLE","count":3},"expected_answer":3},

      {"code":"g1-geo-q13","question_type":"MULTIPLE_CHOICE","prompt":"Hình A ở vị trí nào so với hình B?","options":{"A":"Bên trái","B":"Bên phải","C":"Phía trên","D":"Phía dưới"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Hình tròn A nằm bên trái hình vuông B trên cùng một hàng.","items":[{"id":"a","shape":"CIRCLE","x":14,"y":38,"width":20,"height":20,"label":"A"},{"id":"b","shape":"SQUARE","x":66,"y":38,"width":20,"height":20,"label":"B"}]},"skill_code":"POSITION_RELATIONS","difficulty":"EASY","display_order":13,"check":{"kind":"RELATION","target":"a","reference":"b","relation":"LEFT"},"expected_answer":"Bên trái"},
      {"code":"g1-geo-q14","question_type":"MULTIPLE_CHOICE","prompt":"Hình chữ nhật A ở vị trí nào so với hình tam giác B?","options":{"A":"Bên trái","B":"Bên phải","C":"Phía trên","D":"Phía dưới"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Hình chữ nhật A nằm bên trái hình tam giác B trên cùng một hàng.","items":[{"id":"a","shape":"RECTANGLE","x":12,"y":40,"width":26,"height":16,"label":"A"},{"id":"b","shape":"TRIANGLE","x":68,"y":38,"width":20,"height":20,"label":"B"}]},"skill_code":"POSITION_RELATIONS","difficulty":"EASY","display_order":14,"check":{"kind":"RELATION","target":"a","reference":"b","relation":"LEFT"},"expected_answer":"Bên trái"},
      {"code":"g1-geo-q15","question_type":"MULTIPLE_CHOICE","prompt":"Hình tròn A ở vị trí nào so với hình vuông B?","options":{"A":"Phía trên","B":"Phía dưới","C":"Bên trái","D":"Bên phải"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Hình tròn A nằm phía trên hình vuông B trên cùng một cột.","items":[{"id":"a","shape":"CIRCLE","x":40,"y":8,"width":20,"height":20,"label":"A"},{"id":"b","shape":"SQUARE","x":40,"y":68,"width":20,"height":20,"label":"B"}]},"skill_code":"POSITION_RELATIONS","difficulty":"EASY","display_order":15,"check":{"kind":"RELATION","target":"a","reference":"b","relation":"ABOVE"},"expected_answer":"Phía trên"},
      {"code":"g1-geo-q16","question_type":"MULTIPLE_CHOICE","prompt":"Hình tam giác A ở vị trí nào so với hình chữ nhật B?","options":{"A":"Phía trên","B":"Phía dưới","C":"Bên phải","D":"Ở giữa"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Hình tam giác A nằm phía dưới hình chữ nhật B trên cùng một cột.","items":[{"id":"a","shape":"TRIANGLE","x":40,"y":68,"width":20,"height":20,"label":"A"},{"id":"b","shape":"RECTANGLE","x":37,"y":10,"width":26,"height":16,"label":"B"}]},"skill_code":"POSITION_RELATIONS","difficulty":"EASY","display_order":16,"check":{"kind":"RELATION","target":"a","reference":"b","relation":"BELOW"},"expected_answer":"Phía dưới"},
      {"code":"g1-geo-q17","question_type":"MULTIPLE_CHOICE","prompt":"Hình B ở vị trí nào so với hình A và hình C?","options":{"A":"Bên trái","B":"Bên phải","C":"Ở giữa","D":"Phía trên"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Ba hình A, B, C nằm cùng một hàng; hình vuông B nằm giữa hình tròn A và hình tam giác C.","items":[{"id":"a","shape":"CIRCLE","x":10,"y":38,"width":20,"height":20,"label":"A"},{"id":"b","shape":"SQUARE","x":40,"y":38,"width":20,"height":20,"label":"B"},{"id":"c","shape":"TRIANGLE","x":70,"y":38,"width":20,"height":20,"label":"C"}]},"skill_code":"POSITION_RELATIONS","difficulty":"MEDIUM","display_order":17,"check":{"kind":"BETWEEN","target":"b","left":"a","right":"c"},"expected_answer":"Ở giữa"},
      {"code":"g1-geo-q18","question_type":"MULTIPLE_CHOICE","prompt":"Hình nào ở phía trước và che một phần hình còn lại?","options":{"A":"Hình vuông B","B":"Hình tròn A","C":"Cả hai hình","D":"Không có hình nào"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Hình vuông B được vẽ sau và che một phần hình tròn A, nên hình vuông B ở phía trước.","items":[{"id":"a","shape":"CIRCLE","x":32,"y":28,"width":30,"height":30,"label":"A"},{"id":"b","shape":"SQUARE","x":46,"y":42,"width":26,"height":26,"label":"B"}]},"skill_code":"POSITION_RELATIONS","difficulty":"MEDIUM","display_order":18,"check":{"kind":"FRONT","target":"b","reference":"a"},"expected_answer":"Hình vuông B"},

      {"code":"g1-geo-q19","question_type":"MULTIPLE_CHOICE","prompt":"Trong minh họa có bao nhiêu hình vuông?","options":{"A":"2","B":"3","C":"4","D":"5"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Năm hình A đến E gồm ba hình vuông, một hình tròn và một hình tam giác.","items":[{"id":"a","shape":"SQUARE","x":3,"y":35,"width":16,"height":16,"label":"A"},{"id":"b","shape":"CIRCLE","x":23,"y":35,"width":16,"height":16,"label":"B"},{"id":"c","shape":"SQUARE","x":43,"y":35,"width":16,"height":16,"label":"C"},{"id":"d","shape":"TRIANGLE","x":63,"y":35,"width":16,"height":16,"label":"D"},{"id":"e","shape":"SQUARE","x":83,"y":35,"width":16,"height":16,"label":"E"}]},"skill_code":"COUNT_SHAPES_IN_PICTURE","difficulty":"EASY","display_order":19,"check":{"kind":"COUNT_SHAPE","shape":"SQUARE","count":3},"expected_answer":3},
      {"code":"g1-geo-q20","question_type":"MULTIPLE_CHOICE","prompt":"Minh họa có tất cả bao nhiêu hình?","options":{"A":"4","B":"5","C":"6","D":"7"},"visual_spec":{"kind":"SHAPE_SCENE","description":"Sáu hình A đến F gồm hình tròn, tam giác, vuông, chữ nhật, tròn và tam giác.","items":[{"id":"a","shape":"CIRCLE","x":2,"y":35,"width":14,"height":14,"label":"A"},{"id":"b","shape":"TRIANGLE","x":18,"y":35,"width":14,"height":14,"label":"B"},{"id":"c","shape":"SQUARE","x":34,"y":35,"width":14,"height":14,"label":"C"},{"id":"d","shape":"RECTANGLE","x":50,"y":36,"width":18,"height":12,"label":"D"},{"id":"e","shape":"CIRCLE","x":70,"y":35,"width":14,"height":14,"label":"E"},{"id":"f","shape":"TRIANGLE","x":86,"y":35,"width":14,"height":14,"label":"F"}]},"skill_code":"COUNT_SHAPES_IN_PICTURE","difficulty":"EASY","display_order":20,"check":{"kind":"COUNT_ALL","count":6},"expected_answer":6},
      {"code":"g1-geo-q21","question_type":"NUMBER_INPUT","prompt":"Em đếm được bao nhiêu hình tam giác trong minh họa?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Sáu hình A đến F gồm bốn hình tam giác, một hình tròn và một hình vuông.","items":[{"id":"a","shape":"TRIANGLE","x":2,"y":35,"width":14,"height":14,"label":"A"},{"id":"b","shape":"TRIANGLE","x":18,"y":35,"width":14,"height":14,"label":"B"},{"id":"c","shape":"CIRCLE","x":34,"y":35,"width":14,"height":14,"label":"C"},{"id":"d","shape":"TRIANGLE","x":50,"y":35,"width":14,"height":14,"label":"D"},{"id":"e","shape":"SQUARE","x":66,"y":35,"width":14,"height":14,"label":"E"},{"id":"f","shape":"TRIANGLE","x":82,"y":35,"width":14,"height":14,"label":"F"}]},"skill_code":"COUNT_SHAPES_IN_PICTURE","difficulty":"EASY","display_order":21,"check":{"kind":"COUNT_SHAPE","shape":"TRIANGLE","count":4},"expected_answer":4},
      {"code":"g1-geo-q22","question_type":"NUMBER_INPUT","prompt":"Trong minh họa có bao nhiêu hình chữ nhật?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Năm hình A đến E gồm ba hình chữ nhật, một hình tròn và một hình vuông.","items":[{"id":"a","shape":"RECTANGLE","x":2,"y":36,"width":20,"height":14,"label":"A"},{"id":"b","shape":"CIRCLE","x":25,"y":35,"width":16,"height":16,"label":"B"},{"id":"c","shape":"RECTANGLE","x":44,"y":36,"width":20,"height":14,"label":"C"},{"id":"d","shape":"SQUARE","x":67,"y":35,"width":16,"height":16,"label":"D"},{"id":"e","shape":"RECTANGLE","x":86,"y":36,"width":14,"height":12,"label":"E"}]},"skill_code":"COUNT_SHAPES_IN_PICTURE","difficulty":"EASY","display_order":22,"check":{"kind":"COUNT_SHAPE","shape":"RECTANGLE","count":3},"expected_answer":3},
      {"code":"g1-geo-q23","question_type":"NUMBER_INPUT","prompt":"Em đếm được bao nhiêu hình tròn trong nhóm hình này?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Bảy hình A đến G gồm năm hình tròn, một hình tam giác và một hình vuông.","items":[{"id":"a","shape":"CIRCLE","x":1,"y":35,"width":12,"height":12,"label":"A"},{"id":"b","shape":"CIRCLE","x":15,"y":35,"width":12,"height":12,"label":"B"},{"id":"c","shape":"TRIANGLE","x":29,"y":35,"width":12,"height":12,"label":"C"},{"id":"d","shape":"CIRCLE","x":43,"y":35,"width":12,"height":12,"label":"D"},{"id":"e","shape":"SQUARE","x":57,"y":35,"width":12,"height":12,"label":"E"},{"id":"f","shape":"CIRCLE","x":71,"y":35,"width":12,"height":12,"label":"F"},{"id":"g","shape":"CIRCLE","x":85,"y":35,"width":12,"height":12,"label":"G"}]},"skill_code":"COUNT_SHAPES_IN_PICTURE","difficulty":"MEDIUM","display_order":23,"check":{"kind":"COUNT_SHAPE","shape":"CIRCLE","count":5},"expected_answer":5},
      {"code":"g1-geo-q24","question_type":"NUMBER_INPUT","prompt":"Hãy đếm tất cả các hình: có bao nhiêu hình?","options":null,"visual_spec":{"kind":"SHAPE_SCENE","description":"Bảy hình A đến G gồm hai hình tròn, hai hình tam giác, hai hình vuông và một hình chữ nhật.","items":[{"id":"a","shape":"CIRCLE","x":1,"y":35,"width":12,"height":12,"label":"A"},{"id":"b","shape":"TRIANGLE","x":15,"y":35,"width":12,"height":12,"label":"B"},{"id":"c","shape":"SQUARE","x":29,"y":35,"width":12,"height":12,"label":"C"},{"id":"d","shape":"RECTANGLE","x":43,"y":36,"width":16,"height":12,"label":"D"},{"id":"e","shape":"CIRCLE","x":61,"y":35,"width":12,"height":12,"label":"E"},{"id":"f","shape":"TRIANGLE","x":75,"y":35,"width":12,"height":12,"label":"F"},{"id":"g","shape":"SQUARE","x":88,"y":35,"width":12,"height":12,"label":"G"}]},"skill_code":"COUNT_SHAPES_IN_PICTURE","difficulty":"MEDIUM","display_order":24,"check":{"kind":"COUNT_ALL","count":7},"expected_answer":7}
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
  'grade-1-basic-geometry-and-position',
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
  from jsonb_to_recordset(
    $solutions$[
      {"question_id":"g1-geo-q01","correct_answer":"A","solution_steps":["Quan sát hình A: đường bao cong khép kín và không có cạnh thẳng.","Đặc điểm đó là của hình tròn, nên chọn Hình tròn."],"explanation":"Hình tròn không có cạnh thẳng hay góc.","hint":"Hãy nhìn đường bao của hình A."},
      {"question_id":"g1-geo-q02","correct_answer":"B","solution_steps":["Đếm đường bao của hình B: hình có ba cạnh thẳng.","Hình có ba cạnh là hình tam giác, nên chọn Hình tam giác."],"explanation":"Ba cạnh thẳng là đặc điểm giúp nhận biết hình tam giác.","hint":"Hãy đếm số cạnh của hình B."},
      {"question_id":"g1-geo-q03","correct_answer":"C","solution_steps":["Quan sát hình C có bốn cạnh thẳng.","Bốn cạnh của hình C bằng nhau nên đó là hình vuông."],"explanation":"Hình vuông có bốn cạnh bằng nhau.","hint":"So sánh độ dài bốn cạnh của hình C."},
      {"question_id":"g1-geo-q04","correct_answer":"D","solution_steps":["Quan sát hình D có bốn cạnh thẳng.","Hình có hai cạnh dài và hai cạnh ngắn là hình chữ nhật."],"explanation":"Hình chữ nhật được nhận biết bằng hai cạnh dài và hai cạnh ngắn.","hint":"Tìm hai cạnh dài hơn của hình D."},
      {"question_id":"g1-geo-q05","correct_answer":"2","solution_steps":["Chỉ lần lượt các hình có đường bao cong: hình A và hình C.","Có hai hình được chọn, nên đáp án là 2."],"explanation":"Hình A và hình C đều là hình tròn.","hint":"Đếm những hình không có cạnh thẳng."},
      {"question_id":"g1-geo-q06","correct_answer":"3","solution_steps":["Tìm các hình có ba cạnh: hình A, hình C và hình E.","Có ba hình tam giác, nên đáp án là 3."],"explanation":"Ba hình A, C, E đều có ba cạnh.","hint":"Đếm các hình có đúng ba cạnh."},

      {"question_id":"g1-geo-q07","correct_answer":"B","solution_steps":["Quan sát hình A và hình C đều có đường bao cong, không có cạnh thẳng.","Hai hình này cùng là hình tròn, nên chọn Hình A và hình C."],"explanation":"Hình A và hình C có cùng đặc điểm của hình tròn.","hint":"Tìm hai hình không có cạnh thẳng."},
      {"question_id":"g1-geo-q08","correct_answer":"C","solution_steps":["Quan sát hình A có bốn cạnh bằng nhau và hình D cũng có bốn cạnh bằng nhau.","Cả hai đều là hình vuông, nên chọn Hình A và hình D."],"explanation":"Hai hình A và D có cùng đặc điểm của hình vuông.","hint":"Tìm hai hình có bốn cạnh bằng nhau."},
      {"question_id":"g1-geo-q09","correct_answer":"C","solution_steps":["Hình A, B và D đều có ba cạnh nên cùng là hình tam giác.","Hình C có bốn cạnh bằng nhau nên khác ba hình còn lại."],"explanation":"Hình C là hình vuông, còn ba hình kia là hình tam giác.","hint":"Hãy nhóm ba hình cùng loại trước."},
      {"question_id":"g1-geo-q10","correct_answer":"B","solution_steps":["Quan sát hình A và hình C đều có bốn cạnh.","Bốn cạnh của cả hai hình bằng nhau nên chọn Hình A và hình C."],"explanation":"Hình A và hình C đều là hình vuông.","hint":"So sánh độ dài bốn cạnh của từng hình."},
      {"question_id":"g1-geo-q11","correct_answer":"2","solution_steps":["Tìm các hình có bốn cạnh bằng nhau: hình A và hình C.","Có hai hình như vậy, nên đáp án là 2."],"explanation":"Hình A và hình C là hai hình vuông.","hint":"Chỉ đếm hình có bốn cạnh bằng nhau."},
      {"question_id":"g1-geo-q12","correct_answer":"3","solution_steps":["Hình không có cạnh thẳng là hình tròn: hình A, C và E.","Có ba hình tròn, nên đáp án là 3."],"explanation":"Ba hình A, C, E có đường bao cong khép kín.","hint":"Không đếm các hình có cạnh thẳng."},

      {"question_id":"g1-geo-q13","correct_answer":"A","solution_steps":["Quan sát hai hình nằm trên cùng một hàng.","Hình A xuất hiện trước hình B khi nhìn từ trái sang phải, nên A ở bên trái B."],"explanation":"Vị trí ngang của hình A nhỏ hơn vị trí ngang của hình B.","hint":"Đọc minh họa từ trái sang phải."},
      {"question_id":"g1-geo-q14","correct_answer":"A","solution_steps":["Quan sát hình chữ nhật A và hình tam giác B nằm cùng một hàng.","Hình chữ nhật A nằm về phía trái của hình tam giác B."],"explanation":"Hình A ở bên trái hình B.","hint":"Tìm hình xuất hiện trước khi nhìn từ trái sang phải."},
      {"question_id":"g1-geo-q15","correct_answer":"A","solution_steps":["Quan sát hai hình nằm trên cùng một cột.","Hình tròn A nằm cao hơn hình vuông B, nên A ở phía trên B."],"explanation":"Vị trí dọc của hình A cao hơn vị trí dọc của hình B.","hint":"Nhìn từ trên xuống dưới."},
      {"question_id":"g1-geo-q16","correct_answer":"B","solution_steps":["Quan sát hai hình nằm trên cùng một cột.","Hình tam giác A nằm thấp hơn hình chữ nhật B, nên A ở phía dưới B."],"explanation":"Hình A ở phía dưới hình B.","hint":"Tìm hình nằm gần đáy minh họa hơn."},
      {"question_id":"g1-geo-q17","correct_answer":"C","solution_steps":["Nhìn theo thứ tự từ trái sang phải: hình A, hình B rồi hình C.","Hình B có một hình ở mỗi bên nên B ở giữa A và C."],"explanation":"Hình B nằm giữa hai hình A và C.","hint":"Tìm hình có một hình ở bên trái và một hình ở bên phải."},
      {"question_id":"g1-geo-q18","correct_answer":"A","solution_steps":["Quan sát phần giao nhau: hình vuông B che một phần đường bao của hình tròn A.","Vật che một phần vật khác được nhìn là ở phía trước, nên hình vuông B ở phía trước."],"explanation":"Thứ tự vẽ và phần che khuất cho thấy hình vuông B ở phía trước hình tròn A.","hint":"Tìm hình che lên đường bao của hình còn lại."},

      {"question_id":"g1-geo-q19","correct_answer":"B","solution_steps":["Tìm các hình có bốn cạnh bằng nhau: hình A, hình C và hình E.","Có ba hình vuông, nên chọn 3."],"explanation":"Ba hình A, C, E đều là hình vuông.","hint":"Đếm lần lượt từ trái sang phải."},
      {"question_id":"g1-geo-q20","correct_answer":"C","solution_steps":["Chỉ lần lượt từng hình có nhãn A, B, C, D, E và F.","Có sáu nhãn tương ứng sáu hình, nên chọn 6."],"explanation":"Minh họa có tất cả sáu hình riêng biệt.","hint":"Đếm mỗi nhãn đúng một lần."},
      {"question_id":"g1-geo-q21","correct_answer":"4","solution_steps":["Tìm các hình có ba cạnh: hình A, B, D và F.","Có bốn hình tam giác, nên đáp án là 4."],"explanation":"Bốn hình A, B, D, F đều có ba cạnh.","hint":"Đánh dấu từng hình tam giác trước khi đếm."},
      {"question_id":"g1-geo-q22","correct_answer":"3","solution_steps":["Tìm các hình có hai cạnh dài và hai cạnh ngắn: hình A, C và E.","Có ba hình chữ nhật, nên đáp án là 3."],"explanation":"Ba hình A, C, E là hình chữ nhật.","hint":"Không đếm hình vuông D."},
      {"question_id":"g1-geo-q23","correct_answer":"5","solution_steps":["Tìm các hình có đường bao cong: hình A, B, D, F và G.","Có năm hình tròn, nên đáp án là 5."],"explanation":"Năm hình A, B, D, F, G đều là hình tròn.","hint":"Đếm từ trái sang phải để tránh bỏ sót."},
      {"question_id":"g1-geo-q24","correct_answer":"7","solution_steps":["Chỉ lần lượt các hình có nhãn từ A đến G, mỗi nhãn một lần.","Có bảy hình riêng biệt, nên đáp án là 7."],"explanation":"Minh họa có tổng cộng bảy hình.","hint":"Đếm từng nhãn theo thứ tự chữ cái."}
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
  from public.profiles as profile
  join public.student_profiles as student_profile
    on student_profile.user_id = profile.user_id
  where profile.user_id = v_current_user_id
    and profile.role = 'STUDENT'
    and profile.onboarding_completed;

  if v_student_count <> 1 then
    raise exception 'Student access required';
  end if;

  select
    attempt.status,
    attempt.unit_slug,
    attempt.question_order,
    attempt.total_questions,
    attempt.answered_count,
    attempt.correct_count,
    attempt.started_at,
    attempt.completed_at
  into
    v_attempt_status,
    v_unit_slug,
    v_question_order,
    v_total_questions,
    v_answered_count,
    v_correct_count,
    v_started_at,
    v_completed_at
  from public.practice_attempts as attempt
  where attempt.id = p_attempt_id
    and attempt.student_id = v_current_user_id;

  if v_attempt_status is null then
    raise exception 'Practice unavailable';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'question_id', question.code,
        'question_type', question.question_type,
        'prompt', question.prompt,
        'options', question.options,
        'visual_spec', question.visual_spec,
        'skill_code', question.skill_code,
        'student_answer', answer.normalized_answer,
        'is_correct', answer.is_correct,
        'correct_answer', solution.correct_answer,
        'solution_steps', solution.solution_steps,
        'explanation', solution.explanation,
        'hint', solution.hint,
        'answered_at', answer.answered_at
      )
      order by array_position(v_question_order, answer.question_id)
    ),
    '[]'::jsonb
  )
  into v_review_items
  from public.practice_answers as answer
  join public.questions as question
    on question.code = answer.question_id
  join public.question_solutions as solution
    on solution.question_id = answer.question_id
  where answer.attempt_id = p_attempt_id;

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

revoke all on function public.get_practice_review(uuid) from public;
revoke all on function public.get_practice_review(uuid) from anon;
grant execute on function public.get_practice_review(uuid)
to authenticated;

do $validation$
declare
  v_unit_count integer;
  v_question_count integer;
  v_solution_count integer;
  v_mcq_count integer;
  v_number_count integer;
  v_visual_count integer;
  v_skill_count integer;
  v_invalid_skill_count integer;
  v_invalid_mcq_count integer;
  v_invalid_number_count integer;
  v_invalid_solution_count integer;
  v_duplicate_code_count integer;
  v_duplicate_prompt_count integer;
  v_invalid_visual_count integer;
  v_start_definition text;
  v_submit_definition text;
  v_review_definition text;
  v_constraint_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  where
    unit.slug = 'grade-1-basic-geometry-and-position'
    and unit.grade = 1
    and unit.title = 'Hình học và vị trí cơ bản'
    and unit.total_questions = 24
    and unit.published
    and unit.display_order = 10
    and unit.prerequisite_unit_slug =
      'grade-1-subtraction-within-100-no-borrow'
    and pg_catalog.jsonb_array_length(
      unit.lesson_content -> 'sections'
    ) = 6
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
    count(*) filter (
      where question.visual_spec is not null
    ),
    count(distinct question.skill_code)
  into
    v_question_count,
    v_mcq_count,
    v_number_count,
    v_visual_count,
    v_skill_count
  from public.questions as question
  where question.unit_slug = 'grade-1-basic-geometry-and-position';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-basic-geometry-and-position';

  select count(*)
  into v_invalid_skill_count
  from (
    select question.skill_code, count(*) as question_total
    from public.questions as question
    where question.unit_slug = 'grade-1-basic-geometry-and-position'
    group by question.skill_code
  ) as skill_group
  where
    skill_group.skill_code not in (
      'RECOGNIZE_BASIC_SHAPES',
      'COMPARE_AND_SORT_SHAPES',
      'POSITION_RELATIONS',
      'COUNT_SHAPES_IN_PICTURE'
    )
    or skill_group.question_total <> 6;

  select count(*) - count(distinct question.code)
  into v_duplicate_code_count
  from public.questions as question
  where question.unit_slug = 'grade-1-basic-geometry-and-position';

  select count(*) - count(distinct question.prompt)
  into v_duplicate_prompt_count
  from public.questions as question
  where question.unit_slug = 'grade-1-basic-geometry-and-position';

  select count(*)
  into v_invalid_mcq_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-basic-geometry-and-position'
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
      or exists (
        select 1
        from pg_catalog.jsonb_each_text(question.options) as option_item
        where btrim(option_item.value) = ''
      )
    );

  select count(*)
  into v_invalid_number_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-basic-geometry-and-position'
    and question.question_type = 'NUMBER_INPUT'
    and (
      question.options is not null
      or question.prompt !~* 'bao nhiêu'
      or solution.correct_answer !~ '^(0|[1-9][0-9]?)$'
      or solution.correct_answer::integer not between 0 and 8
    );

  select count(*)
  into v_invalid_solution_count
  from public.questions as question
  left join public.question_solutions as solution
    on solution.question_id = question.code
  where
    question.unit_slug = 'grade-1-basic-geometry-and-position'
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
  into v_invalid_visual_count
  from public.questions as question
  where
    question.unit_slug = 'grade-1-basic-geometry-and-position'
    and (
      question.visual_spec is null
      or not private.is_valid_practice_visual_spec(
        question.visual_spec
      )
    );

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_visual_count <> 24
    or v_skill_count <> 4
    or v_invalid_skill_count <> 0
    or v_duplicate_code_count <> 0
    or v_duplicate_prompt_count <> 0
    or v_invalid_mcq_count <> 0
    or v_invalid_number_count <> 0
    or v_invalid_solution_count <> 0
    or v_invalid_visual_count <> 0
  then
    raise exception 'Grade 1 geometry content validation failed';
  end if;

  if not exists (
    select 1
    from public.learning_units as prerequisite
    join public.learning_units as current_unit
      on current_unit.prerequisite_unit_slug = prerequisite.slug
    where
      prerequisite.slug = 'grade-1-subtraction-within-100-no-borrow'
      and prerequisite.display_order = 9
      and current_unit.slug = 'grade-1-basic-geometry-and-position'
      and current_unit.display_order = 10
  ) then
    raise exception 'Grade 1 geometry prerequisite validation failed';
  end if;

  select pg_catalog.pg_get_constraintdef(constraint_row.oid)
  into v_constraint_definition
  from pg_catalog.pg_constraint as constraint_row
  where
    constraint_row.conrelid = 'public.questions'::regclass
    and constraint_row.conname = 'questions_visual_spec_check'
    and constraint_row.convalidated;

  if
    v_constraint_definition is null
    or v_constraint_definition !~ 'is_valid_practice_visual_spec'
  then
    raise exception 'Practice visual constraint validation failed';
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
    or v_start_definition !~ 'profile.role = ''STUDENT'''
    or v_start_definition !~ 'profile.onboarding_completed'
    or v_start_definition !~ 'v_unit_grade <> v_student_grade'
    or v_submit_definition is null
    or v_submit_definition !~ 'attempt.student_id = v_current_user_id'
    or v_review_definition is null
    or v_review_definition !~ 'attempt.student_id = v_current_user_id'
    or v_review_definition !~ '''visual_spec'', question.visual_spec'
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
    raise exception 'Practice privilege validation failed';
  end if;
end;
$validation$;

commit;
