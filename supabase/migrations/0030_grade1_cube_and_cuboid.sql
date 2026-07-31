begin;

create or replace function private.is_valid_solid_visual_spec(
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
  v_cells text[] := array[]::text[];
  v_cell text;
  v_front_width integer;
  v_front_height integer;
begin
  if
    pg_catalog.jsonb_typeof(p_spec) <> 'object'
    or not (p_spec ?& array['kind', 'description', 'items'])
    or (
      select count(*)
      from pg_catalog.jsonb_object_keys(p_spec)
    ) <> 3
    or p_spec ->> 'kind' <> 'SOLID_SCENE'
    or pg_catalog.jsonb_typeof(p_spec -> 'description') <> 'string'
    or char_length(btrim(p_spec ->> 'description')) not between 12 and 240
    or btrim(p_spec ->> 'description') <> p_spec ->> 'description'
    or lower(p_spec ->> 'description')
      ~ '(https?:|www[.]|javascript:|data:|<|>|đáp án|đúng là|sai là)'
    or pg_catalog.jsonb_typeof(p_spec -> 'items') <> 'array'
    or pg_catalog.jsonb_array_length(p_spec -> 'items') not between 1 and 10
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
          'label',
          'row',
          'column',
          'frontWidth',
          'frontHeight',
          'depth',
          'appearance'
        ]
      )
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(v_item)
      ) <> 8
      or coalesce(v_item ->> 'id', '') !~ '^[a-z][a-z0-9-]{0,19}$'
      or pg_catalog.jsonb_typeof(v_item -> 'label') <> 'string'
      or char_length(btrim(v_item ->> 'label')) not between 1 and 16
      or btrim(v_item ->> 'label') <> v_item ->> 'label'
      or lower(v_item ->> 'label')
        ~ '(https?:|www[.]|javascript:|data:|<|>)'
      or coalesce(v_item ->> 'row', '') !~ '^[12]$'
      or coalesce(v_item ->> 'column', '') !~ '^[1-5]$'
      or coalesce(v_item ->> 'frontWidth', '') !~ '^[0-9]+$'
      or coalesce(v_item ->> 'frontHeight', '') !~ '^[0-9]+$'
      or coalesce(v_item ->> 'depth', '') !~ '^[0-9]+$'
      or coalesce(v_item ->> 'appearance', '') not in (
        'PLAIN',
        'BLOCK',
        'DICE',
        'GIFT_BOX',
        'BOOK',
        'BRICK',
        'SHOEBOX'
      )
    then
      return false;
    end if;

    v_front_width := (v_item ->> 'frontWidth')::integer;
    v_front_height := (v_item ->> 'frontHeight')::integer;
    v_cell := (v_item ->> 'row') || ':' || (v_item ->> 'column');

    if
      v_front_width not between 10 and 16
      or v_front_height not between 10 and 18
      or (v_item ->> 'depth')::integer not between 4 and 6
      or (
        v_item ->> 'appearance' in ('DICE', 'GIFT_BOX')
        and v_front_width <> v_front_height
      )
      or (
        v_item ->> 'appearance' in ('BOOK', 'BRICK', 'SHOEBOX')
        and v_front_width = v_front_height
      )
      or v_item ->> 'id' = any(v_ids)
      or v_item ->> 'label' = any(v_labels)
      or v_cell = any(v_cells)
    then
      return false;
    end if;

    v_ids := array_append(v_ids, v_item ->> 'id');
    v_labels := array_append(v_labels, v_item ->> 'label');
    v_cells := array_append(v_cells, v_cell);
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.is_valid_solid_visual_spec(jsonb)
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
    'SIMPLE_BLOCK_COMPOSITION'
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
  'grade-1-cube-and-cuboid',
  1,
  'Khối lập phương và khối hộp chữ nhật',
  'Nhận biết, phân loại và đếm các khối đơn giản nhìn thấy rõ.',
  $objectives$[
    "Nhận dạng và gọi đúng tên khối lập phương.",
    "Nhận dạng và gọi đúng tên khối hộp chữ nhật.",
    "Liên hệ một số đồ vật quen thuộc với hình khối phù hợp.",
    "Ghép và đếm được các khối đơn vị nhìn thấy rõ trong cấu trúc đơn giản."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "meet-the-cube",
        "title": "Làm quen với khối lập phương",
        "paragraphs": [
          "Khối lập phương trông cân đều theo các chiều. Con xúc xắc và một số khối xếp hình là những đồ vật quen thuộc có dạng này.",
          "Ta quan sát toàn bộ hình dáng của vật, không dựa riêng vào màu sắc hay một mặt nhìn thấy."
        ]
      },
      {
        "code": "meet-the-cuboid",
        "title": "Làm quen với khối hộp chữ nhật",
        "paragraphs": [
          "Khối hộp chữ nhật có thể giống quyển sách, viên gạch đồ chơi hoặc hộp đựng giày.",
          "Khối hộp chữ nhật có nhiều dáng khác nhau: có khối rộng, có khối cao. Không phải khối nào cũng dài theo cùng một hướng."
        ]
      },
      {
        "code": "tell-two-solids-apart",
        "title": "Phân biệt hai loại khối",
        "paragraphs": [
          "Hãy xoay sự chú ý quanh toàn bộ vật rồi so sánh hình dáng cân đều hay hình dáng giống một chiếc hộp.",
          "Tên khối không thay đổi khi ta đặt vật ở vị trí khác. Nhãn chữ giúp ta chỉ đúng vật mà không cần dựa vào màu."
        ]
      },
      {
        "code": "familiar-objects",
        "title": "Hình khối quanh em",
        "paragraphs": [
          "Con xúc xắc và hộp quà cân đều thường gợi nhớ khối lập phương. Quyển sách và hộp đựng giày thường gợi nhớ khối hộp chữ nhật.",
          "Đồ vật thật có thể có thêm chi tiết. Khi phân loại, ta chỉ quan sát hình dáng chính được nêu trong bài."
        ]
      },
      {
        "code": "simple-building",
        "title": "Xếp các khối đơn giản",
        "paragraphs": [
          "Ta có thể đặt các khối đơn vị cạnh nhau để tạo thành một hàng hoặc một nhóm nhỏ.",
          "Trong bài này, mọi khối cần đếm đều được vẽ tách rõ và nhìn thấy đầy đủ."
        ]
      },
      {
        "code": "count-visible-blocks",
        "title": "Đếm từng khối nhìn thấy",
        "paragraphs": [
          "Chỉ lần lượt từng khối từ trái sang phải, rồi chuyển xuống hàng tiếp theo nếu có.",
          "Mỗi khối chỉ được đếm một lần. Kiểm tra lại các nhãn chữ để không bỏ sót hoặc đếm lặp."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Phân loại con xúc xắc và quyển sách",
        "steps": [
          "Quan sát con xúc xắc: hình dáng cân đều theo các chiều nên gợi nhớ khối lập phương.",
          "Quan sát quyển sách: hình dáng giống một chiếc hộp dẹt nên gợi nhớ khối hộp chữ nhật.",
          "Ghép mỗi đồ vật với đúng tên khối."
        ],
        "answer": "Con xúc xắc có dạng khối lập phương; quyển sách có dạng khối hộp chữ nhật."
      },
      {
        "title": "Đếm một hàng khối đơn vị",
        "steps": [
          "Bắt đầu ở khối ngoài cùng bên trái và chỉ từng khối theo thứ tự.",
          "Đếm mỗi khối nhìn thấy đầy đủ đúng một lần.",
          "Kiểm tra lại số nhãn để chắc chắn không bỏ sót."
        ],
        "answer": "Một hàng có bốn khối nhìn thấy thì số khối là 4."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  13,
  'grade-1-basic-geometry-and-position'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from pg_catalog.jsonb_to_recordset(
    $questions$[
      {"code":"g1-solid-q01","question_type":"MULTIPLE_CHOICE","prompt":"Khối nào trong minh họa có dạng khối lập phương?","options":{"A":"Khối A","B":"Khối B","C":"Khối C","D":"Khối D"},"visual_spec":{"kind":"SOLID_SCENE","description":"Bốn khối A đến D được vẽ tách rời bằng nét liền với hình dáng khác nhau.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"SHOEBOX"}]},"skill_code":"CUBE_RECOGNITION","difficulty":"EASY","display_order":1,"check":{"kind":"ITEM","id":"a","category":"CUBE"},"expected_answer":"Khối A"},
      {"code":"g1-solid-q02","question_type":"MULTIPLE_CHOICE","prompt":"Cặp khối nào đều có dạng khối lập phương?","options":{"A":"Khối A và khối B","B":"Khối B và khối D","C":"Khối A và khối C","D":"Khối C và khối D"},"visual_spec":{"kind":"SOLID_SCENE","description":"Bốn khối A đến D được đặt riêng từng ô để so sánh hình dáng.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"PLAIN"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"}]},"skill_code":"CUBE_RECOGNITION","difficulty":"EASY","display_order":2,"check":{"kind":"PAIR","ids":["a","c"],"category":"CUBE"},"expected_answer":"Khối A và khối C"},
      {"code":"g1-solid-q03","question_type":"MULTIPLE_CHOICE","prompt":"Con xúc xắc A có dạng khối nào?","options":{"A":"Khối lập phương","B":"Khối hộp chữ nhật","C":"Hình vuông","D":"Hình chữ nhật"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A được vẽ bằng nét liền, có các chấm tròn trên mặt trước.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"DICE"}]},"skill_code":"CUBE_RECOGNITION","difficulty":"EASY","display_order":3,"check":{"kind":"OBJECT","id":"a","category":"CUBE"},"expected_answer":"Khối lập phương"},
      {"code":"g1-solid-q04","question_type":"MULTIPLE_CHOICE","prompt":"Hộp quà A cân đều trong minh họa gợi nhớ khối nào?","options":{"A":"Hình tròn","B":"Khối lập phương","C":"Khối hộp chữ nhật dẹt","D":"Hình tam giác"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A được vẽ bằng nét liền và có hai dải nơ cắt nhau trên mặt trước.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"GIFT_BOX"}]},"skill_code":"CUBE_RECOGNITION","difficulty":"EASY","display_order":4,"check":{"kind":"OBJECT","id":"a","category":"CUBE"},"expected_answer":"Khối lập phương"},
      {"code":"g1-solid-q05","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu khối lập phương trong minh họa? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Năm khối A đến E được xếp trên một hàng, tách rời và nhìn thấy đầy đủ.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"e","label":"E","row":1,"column":5,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"}]},"skill_code":"CUBE_RECOGNITION","difficulty":"MEDIUM","display_order":5,"check":{"kind":"COUNT_CATEGORY","category":"CUBE","count":3},"expected_answer":3},
      {"code":"g1-solid-q06","question_type":"NUMBER_INPUT","prompt":"Em đếm được bao nhiêu khối lập phương? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Sáu khối A đến F nằm trong hai hàng, mỗi khối có một ô riêng và không che nhau.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"d","label":"D","row":2,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"e","label":"E","row":2,"column":2,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"f","label":"F","row":2,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"}]},"skill_code":"CUBE_RECOGNITION","difficulty":"MEDIUM","display_order":6,"check":{"kind":"COUNT_CATEGORY","category":"CUBE","count":4},"expected_answer":4},

      {"code":"g1-solid-q07","question_type":"MULTIPLE_CHOICE","prompt":"Khối nào trong minh họa có dạng khối hộp chữ nhật?","options":{"A":"Khối A","B":"Khối B","C":"Khối C","D":"Khối D"},"visual_spec":{"kind":"SOLID_SCENE","description":"Bốn khối A đến D được vẽ tách rời với đường viền rõ và nhãn chữ.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"DICE"}]},"skill_code":"CUBOID_RECOGNITION","difficulty":"EASY","display_order":7,"check":{"kind":"ITEM","id":"b","category":"CUBOID"},"expected_answer":"Khối B"},
      {"code":"g1-solid-q08","question_type":"MULTIPLE_CHOICE","prompt":"Cặp khối nào đều có dạng khối hộp chữ nhật?","options":{"A":"Khối A và khối C","B":"Khối A và khối B","C":"Khối B và khối D","D":"Khối C và khối D"},"visual_spec":{"kind":"SOLID_SCENE","description":"Bốn khối A đến D được đặt riêng từng ô để quan sát hình dáng chính.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"}]},"skill_code":"CUBOID_RECOGNITION","difficulty":"EASY","display_order":8,"check":{"kind":"PAIR","ids":["a","c"],"category":"CUBOID"},"expected_answer":"Khối A và khối C"},
      {"code":"g1-solid-q09","question_type":"MULTIPLE_CHOICE","prompt":"Quyển sách A có dạng khối nào?","options":{"A":"Khối lập phương","B":"Hình vuông","C":"Khối hộp chữ nhật","D":"Hình tròn"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A được vẽ dẹt bằng nét liền và có một đường trang sách trên mặt trước.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"BOOK"}]},"skill_code":"CUBOID_RECOGNITION","difficulty":"EASY","display_order":9,"check":{"kind":"OBJECT","id":"a","category":"CUBOID"},"expected_answer":"Khối hộp chữ nhật"},
      {"code":"g1-solid-q10","question_type":"MULTIPLE_CHOICE","prompt":"Hộp đựng giày A gợi nhớ khối nào?","options":{"A":"Hình tam giác","B":"Khối lập phương","C":"Hình chữ nhật phẳng","D":"Khối hộp chữ nhật"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A được vẽ như một chiếc hộp thấp, có nắp và đường viền rõ.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"SHOEBOX"}]},"skill_code":"CUBOID_RECOGNITION","difficulty":"EASY","display_order":10,"check":{"kind":"OBJECT","id":"a","category":"CUBOID"},"expected_answer":"Khối hộp chữ nhật"},
      {"code":"g1-solid-q11","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu khối hộp chữ nhật trong nhóm? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Năm khối A đến E nằm trên một hàng, đều nhìn thấy trọn vẹn và không chồng lên nhau.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"e","label":"E","row":1,"column":5,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"PLAIN"}]},"skill_code":"CUBOID_RECOGNITION","difficulty":"MEDIUM","display_order":11,"check":{"kind":"COUNT_CATEGORY","category":"CUBOID","count":3},"expected_answer":3},
      {"code":"g1-solid-q12","question_type":"NUMBER_INPUT","prompt":"Em đếm được bao nhiêu khối hộp chữ nhật? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Sáu khối A đến F được chia thành hai hàng, mỗi khối có nhãn và ô riêng.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"d","label":"D","row":2,"column":1,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"PLAIN"},{"id":"e","label":"E","row":2,"column":2,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"f","label":"F","row":2,"column":3,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"}]},"skill_code":"CUBOID_RECOGNITION","difficulty":"MEDIUM","display_order":12,"check":{"kind":"COUNT_CATEGORY","category":"CUBOID","count":4},"expected_answer":4},

      {"code":"g1-solid-q13","question_type":"MULTIPLE_CHOICE","prompt":"Con xúc xắc trong minh họa thuộc nhóm đồ vật có dạng khối nào?","options":{"A":"Khối lập phương","B":"Khối hộp chữ nhật","C":"Hình tròn","D":"Hình tam giác"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A có các chấm tròn trên mặt trước và được vẽ tách riêng.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"DICE"}]},"skill_code":"REAL_OBJECT_CLASSIFICATION","difficulty":"EASY","display_order":13,"check":{"kind":"OBJECT","id":"a","category":"CUBE"},"expected_answer":"Khối lập phương"},
      {"code":"g1-solid-q14","question_type":"MULTIPLE_CHOICE","prompt":"Quyển sách trong minh họa thuộc nhóm đồ vật có dạng khối nào?","options":{"A":"Khối lập phương","B":"Hình vuông","C":"Hình tròn","D":"Khối hộp chữ nhật"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A được vẽ dẹt, có đường trang sách và một nhãn chữ bên dưới.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"BOOK"}]},"skill_code":"REAL_OBJECT_CLASSIFICATION","difficulty":"EASY","display_order":14,"check":{"kind":"OBJECT","id":"a","category":"CUBOID"},"expected_answer":"Khối hộp chữ nhật"},
      {"code":"g1-solid-q15","question_type":"MULTIPLE_CHOICE","prompt":"Hộp quà cân đều trong minh họa gần với dạng khối nào?","options":{"A":"Khối hộp chữ nhật dẹt","B":"Hình chữ nhật","C":"Khối lập phương","D":"Hình tròn"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A có hai dải nơ cắt nhau và hình dáng cân đều theo các chiều.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"GIFT_BOX"}]},"skill_code":"REAL_OBJECT_CLASSIFICATION","difficulty":"EASY","display_order":15,"check":{"kind":"OBJECT","id":"a","category":"CUBE"},"expected_answer":"Khối lập phương"},
      {"code":"g1-solid-q16","question_type":"MULTIPLE_CHOICE","prompt":"Viên gạch đồ chơi A gần với dạng khối nào?","options":{"A":"Hình vuông","B":"Khối hộp chữ nhật","C":"Khối lập phương","D":"Hình tam giác"},"visual_spec":{"kind":"SOLID_SCENE","description":"Đồ vật A được vẽ như một viên gạch đồ chơi thấp và có đường viền đậm.","items":[{"id":"a","label":"A","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"BRICK"}]},"skill_code":"REAL_OBJECT_CLASSIFICATION","difficulty":"EASY","display_order":16,"check":{"kind":"OBJECT","id":"a","category":"CUBOID"},"expected_answer":"Khối hộp chữ nhật"},
      {"code":"g1-solid-q17","question_type":"MULTIPLE_CHOICE","prompt":"Cặp đồ vật nào trong minh họa cùng gợi nhớ khối lập phương?","options":{"A":"Đồ vật A và B","B":"Đồ vật B và D","C":"Đồ vật A và C","D":"Đồ vật C và D"},"visual_spec":{"kind":"SOLID_SCENE","description":"Bốn đồ vật A đến D gồm xúc xắc, quyển sách, hộp quà cân đều và hộp đựng giày.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"DICE"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"BOOK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"GIFT_BOX"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"SHOEBOX"}]},"skill_code":"REAL_OBJECT_CLASSIFICATION","difficulty":"MEDIUM","display_order":17,"check":{"kind":"PAIR","ids":["a","c"],"category":"CUBE"},"expected_answer":"Đồ vật A và C"},
      {"code":"g1-solid-q18","question_type":"MULTIPLE_CHOICE","prompt":"Cặp đồ vật nào trong minh họa cùng gợi nhớ khối hộp chữ nhật?","options":{"A":"Đồ vật A và C","B":"Đồ vật B và D","C":"Đồ vật A và B","D":"Đồ vật C và D"},"visual_spec":{"kind":"SOLID_SCENE","description":"Bốn đồ vật A đến D gồm xúc xắc, quyển sách, hộp quà cân đều và hộp đựng giày.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"DICE"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":4,"appearance":"BOOK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"GIFT_BOX"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"SHOEBOX"}]},"skill_code":"REAL_OBJECT_CLASSIFICATION","difficulty":"MEDIUM","display_order":18,"check":{"kind":"PAIR","ids":["b","d"],"category":"CUBOID"},"expected_answer":"Đồ vật B và D"},

      {"code":"g1-solid-q19","question_type":"MULTIPLE_CHOICE","prompt":"Hàng khối trong minh họa có tất cả bao nhiêu khối đơn vị?","options":{"A":"2","B":"3","C":"4","D":"5"},"visual_spec":{"kind":"SOLID_SCENE","description":"Một hàng các khối đơn vị có nhãn A, B và C; mỗi khối nhìn thấy đầy đủ.","items":[{"id":"a","label":"A","row":1,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":3,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":4,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"}]},"skill_code":"SIMPLE_BLOCK_COMPOSITION","difficulty":"EASY","display_order":19,"check":{"kind":"COUNT_ALL","count":3},"expected_answer":"3"},
      {"code":"g1-solid-q20","question_type":"MULTIPLE_CHOICE","prompt":"Mô tả nào đúng với nhóm khối trong minh họa?","options":{"A":"Một khối lập phương và hai khối hộp chữ nhật","B":"Ba khối lập phương","C":"Hai khối lập phương và một khối hộp chữ nhật","D":"Ba khối hộp chữ nhật"},"visual_spec":{"kind":"SOLID_SCENE","description":"Ba khối A, B và C được vẽ tách rõ trên cùng một hàng, không có khối phía sau.","items":[{"id":"a","label":"A","row":1,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":4,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"}]},"skill_code":"SIMPLE_BLOCK_COMPOSITION","difficulty":"MEDIUM","display_order":20,"check":{"kind":"CATEGORY_COUNTS","cube":2,"cuboid":1},"expected_answer":"Hai khối lập phương và một khối hộp chữ nhật"},
      {"code":"g1-solid-q21","question_type":"NUMBER_INPUT","prompt":"Nhóm trong minh họa có tất cả bao nhiêu khối? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Ba khối A, B và C nằm riêng trong ba ô, không chồng lấp hoặc che khuất.","items":[{"id":"a","label":"A","row":1,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":4,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"}]},"skill_code":"SIMPLE_BLOCK_COMPOSITION","difficulty":"EASY","display_order":21,"check":{"kind":"COUNT_ALL","count":3},"expected_answer":3},
      {"code":"g1-solid-q22","question_type":"NUMBER_INPUT","prompt":"Em đếm được tất cả bao nhiêu khối nhìn thấy? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Năm khối A đến E được đặt trong các ô riêng ở hai hàng, mỗi khối đều nhìn thấy trọn vẹn.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"d","label":"D","row":2,"column":1,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"e","label":"E","row":2,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"}]},"skill_code":"SIMPLE_BLOCK_COMPOSITION","difficulty":"EASY","display_order":22,"check":{"kind":"COUNT_ALL","count":5},"expected_answer":5},
      {"code":"g1-solid-q23","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu khối lập phương trong cấu trúc đơn giản này? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Sáu khối A đến F được trình bày trong hai hàng và không có khối nào bị che.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"d","label":"D","row":2,"column":1,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"e","label":"E","row":2,"column":2,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"f","label":"F","row":2,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"}]},"skill_code":"SIMPLE_BLOCK_COMPOSITION","difficulty":"MEDIUM","display_order":23,"check":{"kind":"COUNT_CATEGORY","category":"CUBE","count":4},"expected_answer":4},
      {"code":"g1-solid-q24","question_type":"NUMBER_INPUT","prompt":"Có bao nhiêu khối hộp chữ nhật trong nhóm này? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SOLID_SCENE","description":"Năm khối A đến E nằm trong các ô riêng, tất cả đều hiện đầy đủ ở phía trước.","items":[{"id":"a","label":"A","row":1,"column":1,"frontWidth":16,"frontHeight":10,"depth":5,"appearance":"PLAIN"},{"id":"b","label":"B","row":1,"column":2,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"},{"id":"c","label":"C","row":1,"column":3,"frontWidth":13,"frontHeight":13,"depth":5,"appearance":"BLOCK"},{"id":"d","label":"D","row":1,"column":4,"frontWidth":11,"frontHeight":17,"depth":5,"appearance":"PLAIN"},{"id":"e","label":"E","row":1,"column":5,"frontWidth":14,"frontHeight":14,"depth":5,"appearance":"BLOCK"}]},"skill_code":"SIMPLE_BLOCK_COMPOSITION","difficulty":"MEDIUM","display_order":24,"check":{"kind":"COUNT_CATEGORY","category":"CUBOID","count":2},"expected_answer":2}
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
  'grade-1-cube-and-cuboid',
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
      {"question_id":"g1-solid-q01","correct_answer":"A","solution_steps":["Quan sát khối A có hình dáng cân đều theo các chiều trong minh họa.","Đặc điểm đó gợi nhớ khối lập phương, nên chọn Khối A."],"explanation":"Khối A là khối lập phương trong nhóm bốn khối.","hint":"Tìm khối có hình dáng cân đều."},
      {"question_id":"g1-solid-q02","correct_answer":"C","solution_steps":["Quan sát khối A và khối C đều có hình dáng cân đều theo các chiều.","Hai khối đó cùng là khối lập phương, nên chọn cặp A và C."],"explanation":"Khối A và C cùng thuộc nhóm khối lập phương.","hint":"Tìm hai khối có mặt trước cân đều."},
      {"question_id":"g1-solid-q03","correct_answer":"A","solution_steps":["Nhận ra đồ vật A là con xúc xắc có hình dáng cân đều.","Con xúc xắc gợi nhớ khối lập phương, nên chọn Khối lập phương."],"explanation":"Con xúc xắc là đồ vật quen thuộc có dạng khối lập phương.","hint":"Liên hệ với khối xếp hình cân đều."},
      {"question_id":"g1-solid-q04","correct_answer":"B","solution_steps":["Quan sát hộp quà A được minh họa với hình dáng cân đều theo các chiều.","Hình dáng đó gợi nhớ khối lập phương, nên chọn Khối lập phương."],"explanation":"Hộp quà cân đều trong câu có dạng khối lập phương.","hint":"Quan sát hình dáng chính của hộp quà."},
      {"question_id":"g1-solid-q05","correct_answer":"3","solution_steps":["Chỉ các khối lập phương lần lượt là A, C và E.","Có ba khối được chỉ, nên đáp án là 3."],"explanation":"Ba khối A, C, E có hình dáng lập phương.","hint":"Đếm từng khối cân đều từ trái sang phải."},
      {"question_id":"g1-solid-q06","correct_answer":"4","solution_steps":["Các khối lập phương là A, B, D và F; hai khối còn lại có dạng hộp chữ nhật.","Đếm A, B, D, F được bốn khối, nên nhập 4."],"explanation":"Minh họa có bốn khối lập phương nhìn thấy rõ.","hint":"Đếm theo từng hàng để không bỏ sót."},

      {"question_id":"g1-solid-q07","correct_answer":"B","solution_steps":["Quan sát khối B có hình dáng giống một chiếc hộp, khác các khối cân đều còn lại.","Hình dáng đó là khối hộp chữ nhật, nên chọn Khối B."],"explanation":"Khối B là khối hộp chữ nhật trong nhóm.","hint":"Tìm khối có mặt trước rộng hơn chiều cao."},
      {"question_id":"g1-solid-q08","correct_answer":"A","solution_steps":["Khối A có dáng hộp rộng, còn khối C có dáng hộp cao.","Cả hai đều là khối hộp chữ nhật, nên chọn cặp A và C."],"explanation":"Khối hộp chữ nhật có thể rộng hoặc cao trong minh họa.","hint":"Không chỉ tìm khối nằm ngang; hãy quan sát cả khối cao."},
      {"question_id":"g1-solid-q09","correct_answer":"C","solution_steps":["Quan sát quyển sách A có hình dáng giống một chiếc hộp dẹt.","Đồ vật đó gợi nhớ khối hộp chữ nhật, nên chọn Khối hộp chữ nhật."],"explanation":"Quyển sách trong minh họa có dạng khối hộp chữ nhật.","hint":"Nhìn hình dáng chính của quyển sách."},
      {"question_id":"g1-solid-q10","correct_answer":"D","solution_steps":["Quan sát hộp đựng giày A có dáng một chiếc hộp thấp với nắp rõ ràng.","Hình dáng đó gợi nhớ khối hộp chữ nhật, nên chọn phương án D."],"explanation":"Hộp đựng giày thường có dạng khối hộp chữ nhật.","hint":"Phân biệt khối với hình chữ nhật phẳng."},
      {"question_id":"g1-solid-q11","correct_answer":"3","solution_steps":["Chỉ các khối hộp chữ nhật là A, C và E.","Có ba khối như vậy, nên nhập số 3."],"explanation":"Ba khối A, C, E có dạng khối hộp chữ nhật.","hint":"Đếm cả khối rộng và khối cao."},
      {"question_id":"g1-solid-q12","correct_answer":"4","solution_steps":["Các khối hộp chữ nhật là A, B, D và F; C và E là khối lập phương.","Đếm bốn nhãn A, B, D, F nên đáp án là 4."],"explanation":"Minh họa có bốn khối hộp chữ nhật nhìn thấy đầy đủ.","hint":"Chỉ từng khối theo hai hàng."},

      {"question_id":"g1-solid-q13","correct_answer":"A","solution_steps":["Nhận ra đồ vật A là con xúc xắc có hình dáng cân đều.","Ghép hình dáng đó với khối lập phương."],"explanation":"Con xúc xắc được xếp vào nhóm đồ vật dạng khối lập phương.","hint":"Liên hệ với một khối xếp hình cân đều."},
      {"question_id":"g1-solid-q14","correct_answer":"D","solution_steps":["Nhận ra đồ vật A là quyển sách có hình dáng giống một chiếc hộp dẹt.","Ghép đồ vật đó với khối hộp chữ nhật."],"explanation":"Quyển sách được xếp vào nhóm đồ vật dạng khối hộp chữ nhật.","hint":"Quan sát hình dáng toàn bộ quyển sách."},
      {"question_id":"g1-solid-q15","correct_answer":"C","solution_steps":["Hộp quà A trong câu được vẽ cân đều theo các chiều.","Hình dáng đó gần với khối lập phương, nên chọn phương án C."],"explanation":"Hộp quà cân đều trong minh họa thuộc nhóm khối lập phương.","hint":"Không dựa vào dải nơ; hãy nhìn hình dáng chính."},
      {"question_id":"g1-solid-q16","correct_answer":"B","solution_steps":["Viên gạch đồ chơi A có hình dáng như một chiếc hộp thấp.","Hình dáng đó gần với khối hộp chữ nhật, nên chọn phương án B."],"explanation":"Viên gạch đồ chơi trong câu có dạng khối hộp chữ nhật.","hint":"Phân biệt vật thể khối với hình phẳng."},
      {"question_id":"g1-solid-q17","correct_answer":"C","solution_steps":["Đồ vật A là xúc xắc và đồ vật C là hộp quà cân đều; cả hai có dáng lập phương.","Vì vậy chọn cặp Đồ vật A và C."],"explanation":"A và C cùng gợi nhớ khối lập phương.","hint":"Tìm xúc xắc và hộp quà cân đều."},
      {"question_id":"g1-solid-q18","correct_answer":"B","solution_steps":["Đồ vật B là quyển sách và đồ vật D là hộp đựng giày; cả hai có dáng hộp chữ nhật.","Vì vậy chọn cặp Đồ vật B và D."],"explanation":"B và D cùng gợi nhớ khối hộp chữ nhật.","hint":"Tìm hai đồ vật có dáng một chiếc hộp."},

      {"question_id":"g1-solid-q19","correct_answer":"B","solution_steps":["Chỉ lần lượt ba khối có nhãn A, B và C từ trái sang phải.","Có ba khối nhìn thấy đầy đủ, nên chọn 3."],"explanation":"Hàng minh họa có đúng ba khối đơn vị.","hint":"Đếm mỗi nhãn một lần."},
      {"question_id":"g1-solid-q20","correct_answer":"C","solution_steps":["Khối A và B có dáng lập phương; khối C có dáng hộp chữ nhật.","Nhóm gồm hai khối lập phương và một khối hộp chữ nhật."],"explanation":"Mô tả ở phương án C khớp cả ba khối.","hint":"Phân loại từng nhãn rồi đếm theo nhóm."},
      {"question_id":"g1-solid-q21","correct_answer":"3","solution_steps":["Chỉ từng khối A, B và C; tất cả đều được vẽ tách rời.","Đếm được ba khối, nên nhập số 3."],"explanation":"Nhóm có tổng cộng ba khối nhìn thấy.","hint":"Không cần suy ra khối nào ở phía sau."},
      {"question_id":"g1-solid-q22","correct_answer":"5","solution_steps":["Đếm hàng trên có ba khối A, B, C và hàng dưới có hai khối D, E.","Ba cộng hai bằng năm, nên nhóm có 5 khối."],"explanation":"Tất cả năm khối đều được nhìn thấy đầy đủ.","hint":"Đếm từng hàng rồi gộp số đã đếm."},
      {"question_id":"g1-solid-q23","correct_answer":"4","solution_steps":["Các khối lập phương là A, B, D và F; các khối C, E không thuộc nhóm này.","Đếm A, B, D, F được bốn khối, nên nhập 4."],"explanation":"Cấu trúc đơn giản có bốn khối lập phương nhìn thấy rõ.","hint":"Phân loại từng khối trước khi đếm."},
      {"question_id":"g1-solid-q24","correct_answer":"2","solution_steps":["Các khối hộp chữ nhật là A và D; B, C, E có dáng lập phương.","Có hai khối hộp chữ nhật, nên nhập số 2."],"explanation":"Nhóm có hai khối hộp chữ nhật nhìn thấy đầy đủ.","hint":"Đếm cả khối rộng và khối cao."}
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
  v_display_order_count bigint;
  v_invalid_count bigint;
  v_constraint_definition text;
  v_start_definition text;
begin
  select count(*)
  into v_unit_count
  from public.learning_units as unit
  join public.learning_units as prerequisite
    on prerequisite.slug = unit.prerequisite_unit_slug
  where unit.slug = 'grade-1-cube-and-cuboid'
    and unit.grade = 1
    and unit.title = 'Khối lập phương và khối hộp chữ nhật'
    and unit.published
    and unit.total_questions = 24
    and unit.display_order = 13
    and unit.prerequisite_unit_slug =
      'grade-1-basic-geometry-and-position'
    and prerequisite.grade = 1
    and prerequisite.published
    and prerequisite.display_order = 10
    and pg_catalog.jsonb_array_length(
      unit.lesson_content -> 'sections'
    ) = 6
    and pg_catalog.jsonb_array_length(
      unit.lesson_content -> 'worked_examples'
    ) = 2;

  select
    count(*),
    count(*) filter (where question_type = 'MULTIPLE_CHOICE'),
    count(*) filter (where question_type = 'NUMBER_INPUT')
  into v_question_count, v_mcq_count, v_number_count
  from public.questions
  where unit_slug = 'grade-1-cube-and-cuboid';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-cube-and-cuboid';

  select count(*)
  into v_display_order_count
  from public.learning_units as unit
  where unit.grade = 1
    and unit.display_order = 13;

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
    or v_display_order_count <> 1
  then
    raise exception 'Grade 1 cube and cuboid content count validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from (
    select question.skill_code, count(*) as question_count
    from public.questions as question
    where question.unit_slug = 'grade-1-cube-and-cuboid'
    group by question.skill_code
  ) as skill_count
  where skill_count.question_count <> 6
    or skill_count.skill_code not in (
      'CUBE_RECOGNITION',
      'CUBOID_RECOGNITION',
      'REAL_OBJECT_CLASSIFICATION',
      'SIMPLE_BLOCK_COMPOSITION'
    );

  if
    v_invalid_count <> 0
    or (
      select count(distinct question.skill_code)
      from public.questions as question
      where question.unit_slug = 'grade-1-cube-and-cuboid'
    ) <> 4
  then
    raise exception 'Grade 1 cube and cuboid skill validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  where question.unit_slug = 'grade-1-cube-and-cuboid'
    and (
      not question.published
      or question.visual_spec is null
      or not private.is_valid_solid_visual_spec(question.visual_spec)
      or question.display_order not between 1 and 24
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 cube and cuboid visual validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-cube-and-cuboid'
    and (
      pg_catalog.jsonb_typeof(solution.solution_steps) <> 'array'
      or pg_catalog.jsonb_array_length(solution.solution_steps) < 2
      or btrim(solution.explanation) = ''
      or btrim(solution.hint) = ''
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 cube and cuboid solution validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-cube-and-cuboid'
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
    raise exception 'Grade 1 cube and cuboid MCQ validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-cube-and-cuboid'
    and question.question_type = 'NUMBER_INPUT'
    and (
      question.options is not null
      or question.prompt !~* 'bao nhiêu'
      or solution.correct_answer !~ '^(0|[1-9]|10)$'
      or solution.correct_answer::integer not between 0 and 10
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 cube and cuboid number validation failed';
  end if;

  if (
    select count(*)
    from (
      select question.code
      from public.questions as question
      where question.unit_slug = 'grade-1-cube-and-cuboid'
      group by question.code
      having count(*) > 1
    ) as duplicate_code
  ) <> 0
  or (
    select count(*)
    from (
      select question.prompt
      from public.questions as question
      where question.unit_slug = 'grade-1-cube-and-cuboid'
      group by question.prompt
      having count(*) > 1
    ) as duplicate_prompt
  ) <> 0
  then
    raise exception 'Grade 1 cube and cuboid uniqueness validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-cube-and-cuboid'
    and (
      lower(question.prompt || ' ' || coalesce(question.options::text, ''))
        ~ '(tiền việt nam|diện tích|thể tích|khai triển|khối ẩn|bị che khuất)'
      or lower(question.visual_spec ->> 'description')
        ~ '(đáp án|đúng là|sai là|khối ẩn|bị che khuất)'
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 cube and cuboid scope validation failed';
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
    or v_constraint_definition !~ 'is_valid_time_visual_spec'
    or v_constraint_definition !~ 'is_valid_solid_visual_spec'
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
