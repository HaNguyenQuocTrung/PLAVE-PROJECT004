begin;

create or replace function private.is_valid_time_visual_spec(
  p_spec jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_event jsonb;
  v_index integer := 0;
  v_hour integer;
  v_hour_angle integer;
  v_focus_index integer;
  v_start_weekday integer;
  v_day_count integer;
  v_marked_day integer;
  v_ids text[] := array[]::text[];
  v_labels text[] := array[]::text[];
  v_weekdays constant jsonb := '[
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ nhật"
  ]'::jsonb;
begin
  if
    pg_catalog.jsonb_typeof(p_spec) <> 'object'
    or pg_catalog.jsonb_typeof(p_spec -> 'kind') <> 'string'
    or pg_catalog.jsonb_typeof(p_spec -> 'description') <> 'string'
    or char_length(btrim(p_spec ->> 'description')) not between 12 and 240
    or btrim(p_spec ->> 'description') <> p_spec ->> 'description'
    or lower(p_spec::text)
      ~ '(https?:|www[.]|javascript:|data:|<|>)'
  then
    return false;
  end if;

  if p_spec ->> 'kind' = 'ANALOG_CLOCK' then
    if
      not (
        p_spec ?& array[
          'kind',
          'description',
          'hour',
          'minute',
          'hourAngle',
          'minuteAngle'
        ]
      )
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 6
      or pg_catalog.jsonb_typeof(p_spec -> 'hour') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'minute') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'hourAngle') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'minuteAngle') <> 'number'
      or coalesce(p_spec ->> 'hour', '') !~ '^(?:[1-9]|1[0-2])$'
      or coalesce(p_spec ->> 'hourAngle', '') !~ '^[0-9]+$'
      or p_spec ->> 'minute' <> '0'
      or p_spec ->> 'minuteAngle' <> '0'
    then
      return false;
    end if;

    v_hour := (p_spec ->> 'hour')::integer;
    v_hour_angle := (p_spec ->> 'hourAngle')::integer;
    return
      v_hour_angle between 0 and 330
      and v_hour_angle = mod(v_hour, 12) * 30;
  end if;

  if p_spec ->> 'kind' = 'DAILY_EVENT_SEQUENCE' then
    if
      not (p_spec ?& array['kind', 'description', 'events'])
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 3
      or pg_catalog.jsonb_typeof(p_spec -> 'events') <> 'array'
      or pg_catalog.jsonb_array_length(p_spec -> 'events') not between 3 and 4
    then
      return false;
    end if;

    for v_event in
      select event
      from pg_catalog.jsonb_array_elements(p_spec -> 'events') as event
    loop
      v_index := v_index + 1;
      if
        pg_catalog.jsonb_typeof(v_event) <> 'object'
        or not (v_event ?& array['id', 'label', 'order', 'icon'])
        or (
          select count(*)
          from pg_catalog.jsonb_object_keys(v_event)
        ) <> 4
        or coalesce(v_event ->> 'id', '') !~ '^[a-z][a-z0-9-]{0,19}$'
        or pg_catalog.jsonb_typeof(v_event -> 'label') <> 'string'
        or char_length(btrim(v_event ->> 'label')) not between 2 and 28
        or btrim(v_event ->> 'label') <> v_event ->> 'label'
        or lower(v_event ->> 'label')
          ~ '(https?:|www[.]|javascript:|data:|<|>)'
        or pg_catalog.jsonb_typeof(v_event -> 'order') <> 'number'
        or coalesce(v_event ->> 'order', '') !~ '^[1-4]$'
        or (v_event ->> 'order')::integer <> v_index
        or coalesce(v_event ->> 'icon', '') not in (
          'WAKE',
          'BREAKFAST',
          'SCHOOL',
          'LUNCH',
          'PLAY',
          'DINNER',
          'SLEEP'
        )
        or v_event ->> 'id' = any(v_ids)
        or v_event ->> 'label' = any(v_labels)
      then
        return false;
      end if;
      v_ids := array_append(v_ids, v_event ->> 'id');
      v_labels := array_append(v_labels, v_event ->> 'label');
    end loop;
    return true;
  end if;

  if p_spec ->> 'kind' = 'WEEKDAY_STRIP' then
    if
      not (
        p_spec ?& array[
          'kind',
          'description',
          'days',
          'focusIndex',
          'focusLabel'
        ]
      )
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 5
      or p_spec -> 'days' <> v_weekdays
      or pg_catalog.jsonb_typeof(p_spec -> 'focusIndex') <> 'number'
      or coalesce(p_spec ->> 'focusIndex', '') !~ '^[0-6]$'
      or p_spec ->> 'focusLabel' not in ('Hôm nay', 'Ngày được chọn')
    then
      return false;
    end if;
    v_focus_index := (p_spec ->> 'focusIndex')::integer;
    return v_focus_index between 0 and 6;
  end if;

  if p_spec ->> 'kind' = 'SIMPLE_CALENDAR' then
    if
      not (
        p_spec ?& array[
          'kind',
          'description',
          'monthLabel',
          'weekdayLabels',
          'startWeekday',
          'dayCount',
          'markedDay',
          'markLabel'
        ]
      )
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_spec)
      ) <> 8
      or pg_catalog.jsonb_typeof(p_spec -> 'monthLabel') <> 'string'
      or char_length(btrim(p_spec ->> 'monthLabel')) not between 5 and 24
      or btrim(p_spec ->> 'monthLabel') <> p_spec ->> 'monthLabel'
      or lower(p_spec ->> 'monthLabel')
        ~ '(https?:|www[.]|javascript:|data:|<|>)'
      or p_spec -> 'weekdayLabels' <> v_weekdays
      or pg_catalog.jsonb_typeof(p_spec -> 'startWeekday') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'dayCount') <> 'number'
      or pg_catalog.jsonb_typeof(p_spec -> 'markedDay') <> 'number'
      or coalesce(p_spec ->> 'startWeekday', '') !~ '^[0-6]$'
      or coalesce(p_spec ->> 'dayCount', '') !~ '^(28|29|30|31)$'
      or coalesce(p_spec ->> 'markedDay', '') !~ '^(?:[1-9]|[12][0-9]|3[01])$'
      or p_spec ->> 'markLabel' <> 'Ngày được chọn'
    then
      return false;
    end if;

    v_start_weekday := (p_spec ->> 'startWeekday')::integer;
    v_day_count := (p_spec ->> 'dayCount')::integer;
    v_marked_day := (p_spec ->> 'markedDay')::integer;
    return
      v_start_weekday between 0 and 6
      and v_day_count between 28 and 31
      and v_marked_day between 1 and v_day_count;
  end if;

  return false;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.is_valid_time_visual_spec(jsonb)
from public, anon, authenticated;

alter table public.questions
drop constraint if exists questions_visual_spec_check;

alter table public.questions
add constraint questions_visual_spec_check
check (
  visual_spec is null
  or private.is_valid_practice_visual_spec(visual_spec)
  or private.is_valid_time_visual_spec(visual_spec)
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
    'READ_SIMPLE_CALENDAR'
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
  'grade-1-time-clock-calendar',
  1,
  'Thời gian, đồng hồ và lịch',
  'Đọc giờ đúng, sắp xếp hoạt động quen thuộc và đọc lịch đơn giản.',
  $objectives$[
    "Đọc được giờ đúng khi kim phút chỉ số 12.",
    "Sắp xếp được các hoạt động quen thuộc theo trình tự được minh họa.",
    "Nhận biết tên và thứ tự bảy ngày trong tuần.",
    "Tìm được một ngày và ngày liền trước hoặc liền sau trên lịch đơn giản."
  ]$objectives$::jsonb,
  $lesson${
    "sections": [
      {
        "code": "before-and-after",
        "title": "Trước và sau trong thời gian",
        "paragraphs": [
          "Một hoạt động diễn ra trước, hoạt động khác có thể diễn ra sau. Ta nhìn thứ tự để kể lại đúng.",
          "Khi đề cho một chuỗi hoạt động, hãy bắt đầu từ số 1 rồi đi theo mũi tên."
        ]
      },
      {
        "code": "parts-of-a-day",
        "title": "Các hoạt động trong ngày",
        "paragraphs": [
          "Trong một ngày, các hoạt động quen thuộc thường được nhắc theo buổi sáng, trưa, chiều và tối.",
          "Không cần đoán theo màu sắc. Hãy dựa vào nhãn chữ, số thứ tự hoặc giờ được nêu trong minh họa."
        ]
      },
      {
        "code": "clock-face",
        "title": "Mặt đồng hồ và hai chiếc kim",
        "paragraphs": [
          "Mặt đồng hồ có các số từ 1 đến 12. Kim giờ ngắn hơn, kim phút dài hơn.",
          "Hai kim có độ dài khác nhau nên ta vẫn nhận ra chúng mà không cần dựa vào màu sắc."
        ]
      },
      {
        "code": "read-whole-hours",
        "title": "Đọc giờ đúng",
        "paragraphs": [
          "Khi kim phút dài chỉ số 12, đồng hồ đang chỉ giờ đúng.",
          "Lúc đó, kim giờ ngắn chỉ số nào thì ta đọc là số đó giờ."
        ]
      },
      {
        "code": "days-of-week",
        "title": "Bảy ngày trong tuần",
        "paragraphs": [
          "Một tuần có bảy ngày theo thứ tự: Thứ Hai, Thứ Ba, Thứ Tư, Thứ Năm, Thứ Sáu, Thứ Bảy và Chủ nhật.",
          "Hôm qua, hôm nay và ngày mai luôn phụ thuộc vào ngày đang được chọn trong đề."
        ]
      },
      {
        "code": "read-a-calendar",
        "title": "Đọc một tờ lịch đơn giản",
        "paragraphs": [
          "Lịch minh họa có bảy cột theo thứ tự các ngày trong tuần. Các số ngày tăng lần lượt trong các ô.",
          "Hãy tìm đúng cột, đúng hàng và đúng ô được đánh dấu. Các câu trong bài chỉ hỏi trong cùng một tờ lịch."
        ]
      }
    ],
    "worked_examples": [
      {
        "title": "Đọc đồng hồ chỉ 4 giờ",
        "steps": [
          "Quan sát kim phút dài: kim này đang chỉ số 12 nên đây là giờ đúng.",
          "Quan sát kim giờ ngắn: kim này đang chỉ số 4.",
          "Ghép hai điều quan sát để đọc thời gian."
        ],
        "answer": "Đồng hồ chỉ 4 giờ."
      },
      {
        "title": "Tìm ngày liền sau trên lịch",
        "steps": [
          "Tìm ô ngày 6 trên tờ lịch minh họa.",
          "Đi sang ô kế tiếp theo thứ tự tăng của các số ngày.",
          "Ô kế tiếp mang số 7."
        ],
        "answer": "Ngày liền sau ngày 6 là ngày 7."
      }
    ]
  }$lesson$::jsonb,
  24,
  true,
  12,
  'grade-1-length-measurement'
)
on conflict (slug) do nothing;

with question_seed as (
  select *
  from pg_catalog.jsonb_to_recordset(
    $questions$[
      {"code":"g1-time-q01","question_type":"MULTIPLE_CHOICE","prompt":"Đồng hồ đang chỉ mấy giờ?","options":{"A":"3 giờ","B":"2 giờ","C":"6 giờ","D":"12 giờ"},"visual_spec":{"kind":"ANALOG_CLOCK","description":"Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.","hour":3,"minute":0,"hourAngle":90,"minuteAngle":0},"skill_code":"READ_WHOLE_HOURS","difficulty":"EASY","display_order":1,"check":{"kind":"READ_CLOCK","hour":3},"expected_answer":"3 giờ"},
      {"code":"g1-time-q02","question_type":"MULTIPLE_CHOICE","prompt":"Mặt đồng hồ trong hình cho biết mấy giờ?","options":{"A":"8 giờ","B":"9 giờ","C":"12 giờ","D":"10 giờ"},"visual_spec":{"kind":"ANALOG_CLOCK","description":"Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.","hour":10,"minute":0,"hourAngle":300,"minuteAngle":0},"skill_code":"READ_WHOLE_HOURS","difficulty":"EASY","display_order":2,"check":{"kind":"READ_CLOCK","hour":10},"expected_answer":"10 giờ"},
      {"code":"g1-time-q03","question_type":"NUMBER_INPUT","prompt":"Đồng hồ đang chỉ mấy giờ? Chỉ nhập số.","options":null,"visual_spec":{"kind":"ANALOG_CLOCK","description":"Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.","hour":1,"minute":0,"hourAngle":30,"minuteAngle":0},"skill_code":"READ_WHOLE_HOURS","difficulty":"EASY","display_order":3,"check":{"kind":"READ_CLOCK","hour":1},"expected_answer":1},
      {"code":"g1-time-q04","question_type":"NUMBER_INPUT","prompt":"Hãy nhập số giờ đồng hồ đang chỉ.","options":null,"visual_spec":{"kind":"ANALOG_CLOCK","description":"Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.","hour":5,"minute":0,"hourAngle":150,"minuteAngle":0},"skill_code":"READ_WHOLE_HOURS","difficulty":"EASY","display_order":4,"check":{"kind":"READ_CLOCK","hour":5},"expected_answer":5},
      {"code":"g1-time-q05","question_type":"NUMBER_INPUT","prompt":"Kim giờ ngắn cho biết mấy giờ? Chỉ nhập số.","options":null,"visual_spec":{"kind":"ANALOG_CLOCK","description":"Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.","hour":8,"minute":0,"hourAngle":240,"minuteAngle":0},"skill_code":"READ_WHOLE_HOURS","difficulty":"MEDIUM","display_order":5,"check":{"kind":"READ_CLOCK","hour":8},"expected_answer":8},
      {"code":"g1-time-q06","question_type":"NUMBER_INPUT","prompt":"Đồng hồ chỉ giờ đúng nào? Chỉ nhập số.","options":null,"visual_spec":{"kind":"ANALOG_CLOCK","description":"Mặt đồng hồ có đủ mười hai số, kim giờ ngắn và kim phút dài.","hour":12,"minute":0,"hourAngle":0,"minuteAngle":0},"skill_code":"READ_WHOLE_HOURS","difficulty":"MEDIUM","display_order":6,"check":{"kind":"READ_CLOCK","hour":12},"expected_answer":12},

      {"code":"g1-time-q07","question_type":"MULTIPLE_CHOICE","prompt":"Theo minh họa, hoạt động nào diễn ra trước khi đến lớp?","options":{"A":"Ăn tối","B":"Ăn sáng","C":"Đến lớp","D":"Đi ngủ"},"visual_spec":{"kind":"DAILY_EVENT_SEQUENCE","description":"Ba hoạt động quen thuộc được đánh số và nối theo một thứ tự rõ ràng.","events":[{"id":"breakfast","label":"Ăn sáng","order":1,"icon":"BREAKFAST"},{"id":"school","label":"Đến lớp","order":2,"icon":"SCHOOL"},{"id":"dinner","label":"Ăn tối","order":3,"icon":"DINNER"}]},"skill_code":"ORDER_DAILY_EVENTS","difficulty":"EASY","display_order":7,"check":{"kind":"BEFORE","reference":"school","target":"breakfast"},"expected_answer":"Ăn sáng"},
      {"code":"g1-time-q08","question_type":"MULTIPLE_CHOICE","prompt":"Theo minh họa, hoạt động nào diễn ra ngay sau khi ăn trưa?","options":{"A":"Đi ngủ","B":"Ăn trưa","C":"Vui chơi","D":"Thức dậy"},"visual_spec":{"kind":"DAILY_EVENT_SEQUENCE","description":"Ba hoạt động quen thuộc được đánh số và nối theo một thứ tự rõ ràng.","events":[{"id":"lunch","label":"Ăn trưa","order":1,"icon":"LUNCH"},{"id":"play","label":"Vui chơi","order":2,"icon":"PLAY"},{"id":"sleep","label":"Đi ngủ","order":3,"icon":"SLEEP"}]},"skill_code":"ORDER_DAILY_EVENTS","difficulty":"EASY","display_order":8,"check":{"kind":"AFTER","reference":"lunch","target":"play"},"expected_answer":"Vui chơi"},
      {"code":"g1-time-q09","question_type":"MULTIPLE_CHOICE","prompt":"Chọn thứ tự đúng theo minh họa.","options":{"A":"Ăn sáng, Đến lớp, Ăn tối","B":"Đến lớp, Ăn sáng, Ăn tối","C":"Ăn tối, Đến lớp, Ăn sáng","D":"Ăn sáng, Ăn tối, Đến lớp"},"visual_spec":{"kind":"DAILY_EVENT_SEQUENCE","description":"Ba hoạt động quen thuộc được đánh số và nối theo một thứ tự rõ ràng.","events":[{"id":"breakfast","label":"Ăn sáng","order":1,"icon":"BREAKFAST"},{"id":"school","label":"Đến lớp","order":2,"icon":"SCHOOL"},{"id":"dinner","label":"Ăn tối","order":3,"icon":"DINNER"}]},"skill_code":"ORDER_DAILY_EVENTS","difficulty":"EASY","display_order":9,"check":{"kind":"FULL_ORDER","targets":["breakfast","school","dinner"]},"expected_answer":"Ăn sáng, Đến lớp, Ăn tối"},
      {"code":"g1-time-q10","question_type":"MULTIPLE_CHOICE","prompt":"Hoạt động nào đứng đầu trong minh họa?","options":{"A":"Đến lớp","B":"Ăn sáng","C":"Thức dậy","D":"Đi ngủ"},"visual_spec":{"kind":"DAILY_EVENT_SEQUENCE","description":"Ba hoạt động quen thuộc được đánh số và nối theo một thứ tự rõ ràng.","events":[{"id":"wake","label":"Thức dậy","order":1,"icon":"WAKE"},{"id":"breakfast","label":"Ăn sáng","order":2,"icon":"BREAKFAST"},{"id":"school","label":"Đến lớp","order":3,"icon":"SCHOOL"}]},"skill_code":"ORDER_DAILY_EVENTS","difficulty":"EASY","display_order":10,"check":{"kind":"FIRST","target":"wake"},"expected_answer":"Thức dậy"},
      {"code":"g1-time-q11","question_type":"MULTIPLE_CHOICE","prompt":"Hoạt động nào đứng cuối trong minh họa?","options":{"A":"Đến lớp","B":"Vui chơi","C":"Ăn trưa","D":"Đi ngủ"},"visual_spec":{"kind":"DAILY_EVENT_SEQUENCE","description":"Ba hoạt động quen thuộc được đánh số và nối theo một thứ tự rõ ràng.","events":[{"id":"school","label":"Đến lớp","order":1,"icon":"SCHOOL"},{"id":"play","label":"Vui chơi","order":2,"icon":"PLAY"},{"id":"sleep","label":"Đi ngủ","order":3,"icon":"SLEEP"}]},"skill_code":"ORDER_DAILY_EVENTS","difficulty":"EASY","display_order":11,"check":{"kind":"LAST","target":"sleep"},"expected_answer":"Đi ngủ"},
      {"code":"g1-time-q12","question_type":"MULTIPLE_CHOICE","prompt":"Hoạt động nào nằm giữa thức dậy và ăn trưa?","options":{"A":"Đi ngủ","B":"Đến lớp","C":"Ăn tối","D":"Vui chơi"},"visual_spec":{"kind":"DAILY_EVENT_SEQUENCE","description":"Ba hoạt động quen thuộc được đánh số và nối theo một thứ tự rõ ràng.","events":[{"id":"wake","label":"Thức dậy","order":1,"icon":"WAKE"},{"id":"school","label":"Đến lớp","order":2,"icon":"SCHOOL"},{"id":"lunch","label":"Ăn trưa","order":3,"icon":"LUNCH"}]},"skill_code":"ORDER_DAILY_EVENTS","difficulty":"MEDIUM","display_order":12,"check":{"kind":"BETWEEN","before":"wake","target":"school","after":"lunch"},"expected_answer":"Đến lớp"},

      {"code":"g1-time-q13","question_type":"MULTIPLE_CHOICE","prompt":"Nếu hôm nay là Thứ Hai thì ngày mai là ngày nào?","options":{"A":"Chủ nhật","B":"Thứ Ba","C":"Thứ Tư","D":"Thứ Sáu"},"visual_spec":{"kind":"WEEKDAY_STRIP","description":"Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép và nhãn chữ.","days":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"focusIndex":0,"focusLabel":"Hôm nay"},"skill_code":"DAYS_OF_WEEK","difficulty":"EASY","display_order":13,"check":{"kind":"NEXT_WEEKDAY","focusIndex":0},"expected_answer":"Thứ Ba"},
      {"code":"g1-time-q14","question_type":"MULTIPLE_CHOICE","prompt":"Nếu hôm nay là Thứ Tư thì hôm qua là ngày nào?","options":{"A":"Thứ Hai","B":"Thứ Ba","C":"Thứ Năm","D":"Chủ nhật"},"visual_spec":{"kind":"WEEKDAY_STRIP","description":"Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép và nhãn chữ.","days":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"focusIndex":2,"focusLabel":"Hôm nay"},"skill_code":"DAYS_OF_WEEK","difficulty":"EASY","display_order":14,"check":{"kind":"PREVIOUS_WEEKDAY","focusIndex":2},"expected_answer":"Thứ Ba"},
      {"code":"g1-time-q15","question_type":"MULTIPLE_CHOICE","prompt":"Nếu hôm nay là Thứ Sáu thì ngày mai là ngày nào?","options":{"A":"Thứ Năm","B":"Chủ nhật","C":"Thứ Bảy","D":"Thứ Hai"},"visual_spec":{"kind":"WEEKDAY_STRIP","description":"Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép và nhãn chữ.","days":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"focusIndex":4,"focusLabel":"Hôm nay"},"skill_code":"DAYS_OF_WEEK","difficulty":"EASY","display_order":15,"check":{"kind":"NEXT_WEEKDAY","focusIndex":4},"expected_answer":"Thứ Bảy"},
      {"code":"g1-time-q16","question_type":"MULTIPLE_CHOICE","prompt":"Nếu hôm nay là Chủ nhật thì ngày mai là ngày nào?","options":{"A":"Thứ Hai","B":"Thứ Bảy","C":"Thứ Ba","D":"Thứ Sáu"},"visual_spec":{"kind":"WEEKDAY_STRIP","description":"Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép và nhãn chữ.","days":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"focusIndex":6,"focusLabel":"Hôm nay"},"skill_code":"DAYS_OF_WEEK","difficulty":"MEDIUM","display_order":16,"check":{"kind":"NEXT_WEEKDAY","focusIndex":6},"expected_answer":"Thứ Hai"},
      {"code":"g1-time-q17","question_type":"MULTIPLE_CHOICE","prompt":"Ngày đứng ngay trước Thứ Ba là ngày nào?","options":{"A":"Thứ Hai","B":"Thứ Tư","C":"Thứ Năm","D":"Chủ nhật"},"visual_spec":{"kind":"WEEKDAY_STRIP","description":"Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép và nhãn chữ.","days":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"focusIndex":1,"focusLabel":"Ngày được chọn"},"skill_code":"DAYS_OF_WEEK","difficulty":"EASY","display_order":17,"check":{"kind":"PREVIOUS_WEEKDAY","focusIndex":1},"expected_answer":"Thứ Hai"},
      {"code":"g1-time-q18","question_type":"MULTIPLE_CHOICE","prompt":"Ngày đứng ngay sau Thứ Năm là ngày nào?","options":{"A":"Thứ Tư","B":"Thứ Bảy","C":"Thứ Sáu","D":"Chủ nhật"},"visual_spec":{"kind":"WEEKDAY_STRIP","description":"Dải bảy ngày trong tuần theo đúng thứ tự, một ngày có khung kép và nhãn chữ.","days":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"focusIndex":3,"focusLabel":"Ngày được chọn"},"skill_code":"DAYS_OF_WEEK","difficulty":"EASY","display_order":18,"check":{"kind":"NEXT_WEEKDAY","focusIndex":3},"expected_answer":"Thứ Sáu"},

      {"code":"g1-time-q19","question_type":"MULTIPLE_CHOICE","prompt":"Ô có khung kép đánh dấu ngày nào?","options":{"A":"12","B":"13","C":"14","D":"15"},"visual_spec":{"kind":"SIMPLE_CALENDAR","description":"Tờ lịch minh họa có bảy cột, các ngày tăng liên tiếp và một ô dùng khung kép.","monthLabel":"Tháng 4 minh họa","weekdayLabels":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"startWeekday":0,"dayCount":30,"markedDay":14,"markLabel":"Ngày được chọn"},"skill_code":"READ_SIMPLE_CALENDAR","difficulty":"EASY","display_order":19,"check":{"kind":"MARKED_DAY","day":14},"expected_answer":"14"},
      {"code":"g1-time-q20","question_type":"MULTIPLE_CHOICE","prompt":"Ngày 17 được đánh dấu nằm ở cột ngày nào trong tuần?","options":{"A":"Thứ Ba","B":"Thứ Tư","C":"Thứ Năm","D":"Thứ Sáu"},"visual_spec":{"kind":"SIMPLE_CALENDAR","description":"Tờ lịch minh họa có bảy cột, các ngày tăng liên tiếp và một ô dùng khung kép.","monthLabel":"Tháng 6 minh họa","weekdayLabels":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"startWeekday":0,"dayCount":30,"markedDay":17,"markLabel":"Ngày được chọn"},"skill_code":"READ_SIMPLE_CALENDAR","difficulty":"MEDIUM","display_order":20,"check":{"kind":"MARKED_WEEKDAY","weekdayIndex":2},"expected_answer":"Thứ Tư"},
      {"code":"g1-time-q21","question_type":"NUMBER_INPUT","prompt":"Ngày nào đang được đánh dấu? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SIMPLE_CALENDAR","description":"Tờ lịch minh họa có bảy cột, các ngày tăng liên tiếp và một ô dùng khung kép.","monthLabel":"Tháng 9 minh họa","weekdayLabels":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"startWeekday":2,"dayCount":30,"markedDay":9,"markLabel":"Ngày được chọn"},"skill_code":"READ_SIMPLE_CALENDAR","difficulty":"EASY","display_order":21,"check":{"kind":"MARKED_DAY","day":9},"expected_answer":9},
      {"code":"g1-time-q22","question_type":"NUMBER_INPUT","prompt":"Ngày liền trước ngày được đánh dấu là ngày nào? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SIMPLE_CALENDAR","description":"Tờ lịch minh họa có bảy cột, các ngày tăng liên tiếp và một ô dùng khung kép.","monthLabel":"Tháng 11 minh họa","weekdayLabels":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"startWeekday":4,"dayCount":30,"markedDay":12,"markLabel":"Ngày được chọn"},"skill_code":"READ_SIMPLE_CALENDAR","difficulty":"EASY","display_order":22,"check":{"kind":"PREVIOUS_DATE","day":11},"expected_answer":11},
      {"code":"g1-time-q23","question_type":"NUMBER_INPUT","prompt":"Ngày liền sau ngày được đánh dấu là ngày nào? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SIMPLE_CALENDAR","description":"Tờ lịch minh họa có bảy cột, các ngày tăng liên tiếp và một ô dùng khung kép.","monthLabel":"Tháng 8 minh họa","weekdayLabels":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"startWeekday":3,"dayCount":31,"markedDay":20,"markLabel":"Ngày được chọn"},"skill_code":"READ_SIMPLE_CALENDAR","difficulty":"EASY","display_order":23,"check":{"kind":"NEXT_DATE","day":21},"expected_answer":21},
      {"code":"g1-time-q24","question_type":"NUMBER_INPUT","prompt":"Ngày ở cùng cột, ngay hàng dưới ngày được đánh dấu là ngày nào? Chỉ nhập số.","options":null,"visual_spec":{"kind":"SIMPLE_CALENDAR","description":"Tờ lịch minh họa có bảy cột, các ngày tăng liên tiếp và một ô dùng khung kép.","monthLabel":"Tháng 3 minh họa","weekdayLabels":["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"],"startWeekday":1,"dayCount":31,"markedDay":8,"markLabel":"Ngày được chọn"},"skill_code":"READ_SIMPLE_CALENDAR","difficulty":"MEDIUM","display_order":24,"check":{"kind":"WEEK_AFTER","day":15},"expected_answer":15}
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
  'grade-1-time-clock-calendar',
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
      {"question_id":"g1-time-q01","correct_answer":"A","solution_steps":["Kim phút dài đang chỉ số 12 nên đây là giờ đúng.","Kim giờ ngắn chỉ số 3, vì vậy đồng hồ chỉ 3 giờ."],"explanation":"Ở giờ đúng, đọc số mà kim giờ ngắn đang chỉ.","hint":"Tìm kim dài ở số 12 rồi nhìn kim ngắn."},
      {"question_id":"g1-time-q02","correct_answer":"D","solution_steps":["Kim phút dài chỉ số 12 nên ta đọc giờ đúng.","Kim giờ ngắn chỉ số 10, nên thời gian là 10 giờ."],"explanation":"Kim giờ cho biết số giờ khi kim phút ở số 12.","hint":"Phân biệt kim giờ ngắn với kim phút dài."},
      {"question_id":"g1-time-q03","correct_answer":"1","solution_steps":["Kim phút dài ở số 12 cho biết đồng hồ đang chỉ giờ đúng.","Kim giờ ngắn ở số 1, nên chỉ nhập số 1."],"explanation":"Đồng hồ minh họa 1 giờ.","hint":"Nhìn đầu kim ngắn."},
      {"question_id":"g1-time-q04","correct_answer":"5","solution_steps":["Kiểm tra kim phút dài đang chỉ số 12.","Kim giờ ngắn chỉ số 5, nên nhập số 5."],"explanation":"Hai kim cho biết thời gian 5 giờ đúng.","hint":"Đọc số kim ngắn đang chỉ."},
      {"question_id":"g1-time-q05","correct_answer":"8","solution_steps":["Kim phút ở số 12 xác nhận đây là giờ đúng.","Kim giờ ngắn chỉ số 8, nên đáp án là 8."],"explanation":"Đồng hồ đang chỉ 8 giờ.","hint":"Không đọc theo kim dài."},
      {"question_id":"g1-time-q06","correct_answer":"12","solution_steps":["Kim phút dài chỉ số 12 như mọi giờ đúng trong bài.","Kim giờ ngắn cũng chỉ số 12, nên nhập số 12."],"explanation":"Hai kim cùng hướng lên số 12 biểu diễn 12 giờ đúng.","hint":"Quan sát cả hai kim ở phía trên."},

      {"question_id":"g1-time-q07","correct_answer":"B","solution_steps":["Theo số thứ tự, Ăn sáng đứng ở vị trí 1 và Đến lớp đứng ở vị trí 2.","Vì vị trí 1 diễn ra trước vị trí 2, hoạt động cần chọn là Ăn sáng."],"explanation":"Minh họa đặt Ăn sáng trước Đến lớp.","hint":"Đi theo mũi tên từ trái sang phải."},
      {"question_id":"g1-time-q08","correct_answer":"C","solution_steps":["Ăn trưa ở bước 1 trong chuỗi minh họa.","Bước ngay sau là Vui chơi ở bước 2."],"explanation":"Theo thứ tự đã cho, Vui chơi diễn ra ngay sau Ăn trưa.","hint":"Tìm thẻ mang số kế tiếp."},
      {"question_id":"g1-time-q09","correct_answer":"A","solution_steps":["Đọc các thẻ theo số 1, 2 rồi 3.","Ba nhãn lần lượt là Ăn sáng, Đến lớp và Ăn tối."],"explanation":"Phương án A giữ đúng toàn bộ thứ tự trong hình.","hint":"Không đổi chỗ hai thẻ liền nhau."},
      {"question_id":"g1-time-q10","correct_answer":"C","solution_steps":["Hoạt động đứng đầu mang số 1.","Thẻ số 1 có nhãn Thức dậy, nên đó là hoạt động đầu tiên."],"explanation":"Thức dậy đứng trước Ăn sáng và Đến lớp trong minh họa.","hint":"Tìm thẻ có số nhỏ nhất."},
      {"question_id":"g1-time-q11","correct_answer":"D","solution_steps":["Chuỗi có ba bước và bước cuối mang số 3.","Thẻ số 3 có nhãn Đi ngủ."],"explanation":"Đi ngủ là hoạt động cuối trong thứ tự được cung cấp.","hint":"Tìm thẻ ở cuối mũi tên."},
      {"question_id":"g1-time-q12","correct_answer":"B","solution_steps":["Thức dậy đứng ở bước 1 và Ăn trưa đứng ở bước 3.","Hoạt động ở giữa là bước 2, có nhãn Đến lớp."],"explanation":"Đến lớp nằm giữa hai hoạt động đã nêu trong minh họa.","hint":"Tìm thẻ số 2."},

      {"question_id":"g1-time-q13","correct_answer":"B","solution_steps":["Trên dải tuần, Thứ Hai đứng trước Thứ Ba.","Ngày liền sau hôm nay là ngày mai, nên ngày mai là Thứ Ba."],"explanation":"Thứ Ba là ngày tiếp theo sau Thứ Hai.","hint":"Đi sang ô ngay bên phải Thứ Hai."},
      {"question_id":"g1-time-q14","correct_answer":"B","solution_steps":["Hôm nay được đánh dấu ở Thứ Tư.","Ngày liền trước Thứ Tư là Thứ Ba, nên đó là hôm qua."],"explanation":"Thứ tự tuần cho thấy Thứ Ba đứng ngay trước Thứ Tư.","hint":"Lùi một ô trên dải ngày."},
      {"question_id":"g1-time-q15","correct_answer":"C","solution_steps":["Hôm nay là Thứ Sáu theo ô được đánh dấu.","Ô ngay sau Thứ Sáu là Thứ Bảy."],"explanation":"Ngày mai của Thứ Sáu là Thứ Bảy.","hint":"Tiến một ô theo thứ tự tuần."},
      {"question_id":"g1-time-q16","correct_answer":"A","solution_steps":["Chủ nhật là ngày cuối trên dải một tuần.","Sau Chủ nhật, một tuần mới bắt đầu bằng Thứ Hai."],"explanation":"Ngày mai của Chủ nhật là Thứ Hai.","hint":"Khi hết dải, quay lại ngày đầu tuần."},
      {"question_id":"g1-time-q17","correct_answer":"A","solution_steps":["Thứ Ba đang được chọn trên dải ngày.","Ô ngay trước Thứ Ba là Thứ Hai."],"explanation":"Thứ Hai đứng liền trước Thứ Ba trong tuần.","hint":"Lùi một ô từ Thứ Ba."},
      {"question_id":"g1-time-q18","correct_answer":"C","solution_steps":["Thứ Năm đang được chọn trên dải ngày.","Ô ngay sau Thứ Năm là Thứ Sáu."],"explanation":"Thứ Sáu đứng liền sau Thứ Năm.","hint":"Tiến một ô từ Thứ Năm."},

      {"question_id":"g1-time-q19","correct_answer":"C","solution_steps":["Tìm ô có khung kép trên tờ lịch minh họa.","Số nằm trong ô đó là 14, nên chọn phương án 14."],"explanation":"Khung kép và nhãn chữ cùng chỉ ô ngày 14.","hint":"Đọc số bên trong ô được đánh dấu."},
      {"question_id":"g1-time-q20","correct_answer":"B","solution_steps":["Tìm ô ngày 17 trên tờ lịch.","Dò thẳng lên tiêu đề cột, ô này nằm dưới cột Thứ Tư."],"explanation":"Ngày 17 trong lịch minh họa nằm ở cột Thứ Tư.","hint":"Giữ đúng cột của ô ngày 17."},
      {"question_id":"g1-time-q21","correct_answer":"9","solution_steps":["Quan sát ô có khung kép trên lịch.","Ô đó mang số 9, nên chỉ nhập số 9."],"explanation":"Ngày được chọn là ngày 9.","hint":"Đọc số ở giữa khung kép."},
      {"question_id":"g1-time-q22","correct_answer":"11","solution_steps":["Ngày được đánh dấu là ngày 12.","Ngày liền trước có số nhỏ hơn 1: 12 trừ 1 bằng 11."],"explanation":"Trên cùng tờ lịch, ngày 11 đứng ngay trước ngày 12.","hint":"Lùi một số ngày."},
      {"question_id":"g1-time-q23","correct_answer":"21","solution_steps":["Ngày được đánh dấu là ngày 20.","Ngày liền sau tăng thêm 1: 20 cộng 1 bằng 21."],"explanation":"Ngày 21 đứng ngay sau ngày 20 trên lịch.","hint":"Tiến một số ngày."},
      {"question_id":"g1-time-q24","correct_answer":"15","solution_steps":["Hai ô cùng cột ở hai hàng liền nhau cách nhau bảy ngày.","Ngày được đánh dấu là 8, nên ô ngay hàng dưới là 8 cộng 7 bằng 15."],"explanation":"Ngày 15 nằm cùng cột và ngay hàng dưới ngày 8.","hint":"Tiến xuống đúng một hàng trong cùng cột."}
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
  where unit.slug = 'grade-1-time-clock-calendar'
    and unit.grade = 1
    and unit.title = 'Thời gian, đồng hồ và lịch'
    and unit.published
    and unit.total_questions = 24
    and unit.display_order = 12
    and unit.prerequisite_unit_slug = 'grade-1-length-measurement'
    and prerequisite.grade = 1
    and prerequisite.published
    and prerequisite.display_order = 11;

  select
    count(*),
    count(*) filter (where question_type = 'MULTIPLE_CHOICE'),
    count(*) filter (where question_type = 'NUMBER_INPUT')
  into v_question_count, v_mcq_count, v_number_count
  from public.questions
  where unit_slug = 'grade-1-time-clock-calendar';

  select count(*)
  into v_solution_count
  from public.question_solutions as solution
  join public.questions as question
    on question.code = solution.question_id
  where question.unit_slug = 'grade-1-time-clock-calendar';

  if
    v_unit_count <> 1
    or v_question_count <> 24
    or v_solution_count <> 24
    or v_mcq_count <> 16
    or v_number_count <> 8
  then
    raise exception 'Grade 1 time content count validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from (
    select
      question.skill_code,
      count(*) as question_count,
      count(*) filter (
        where question.question_type = 'MULTIPLE_CHOICE'
      ) as mcq_count,
      count(*) filter (
        where question.question_type = 'NUMBER_INPUT'
      ) as number_count
    from public.questions as question
    where question.unit_slug = 'grade-1-time-clock-calendar'
    group by question.skill_code
  ) as skill_count
  where
    skill_count.question_count <> 6
    or (
      skill_count.skill_code = 'READ_WHOLE_HOURS'
      and (skill_count.mcq_count <> 2 or skill_count.number_count <> 4)
    )
    or (
      skill_count.skill_code in ('ORDER_DAILY_EVENTS', 'DAYS_OF_WEEK')
      and (skill_count.mcq_count <> 6 or skill_count.number_count <> 0)
    )
    or (
      skill_count.skill_code = 'READ_SIMPLE_CALENDAR'
      and (skill_count.mcq_count <> 2 or skill_count.number_count <> 4)
    )
    or skill_count.skill_code not in (
      'READ_WHOLE_HOURS',
      'ORDER_DAILY_EVENTS',
      'DAYS_OF_WEEK',
      'READ_SIMPLE_CALENDAR'
    );

  if
    v_invalid_count <> 0
    or (
      select count(distinct question.skill_code)
      from public.questions as question
      where question.unit_slug = 'grade-1-time-clock-calendar'
    ) <> 4
  then
    raise exception 'Grade 1 time skill distribution validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  where question.unit_slug = 'grade-1-time-clock-calendar'
    and (
      not question.published
      or question.visual_spec is null
      or not private.is_valid_time_visual_spec(question.visual_spec)
      or question.display_order not between 1 and 24
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 time visual validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-time-clock-calendar'
    and (
      pg_catalog.jsonb_typeof(solution.solution_steps) <> 'array'
      or pg_catalog.jsonb_array_length(solution.solution_steps) < 2
      or btrim(solution.explanation) = ''
      or btrim(solution.hint) = ''
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 time solution validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-time-clock-calendar'
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
    raise exception 'Grade 1 time multiple-choice validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-time-clock-calendar'
    and question.question_type = 'NUMBER_INPUT'
    and (
      question.options is not null
      or solution.correct_answer !~ '^(0|[1-9]|[12][0-9]|3[01])$'
      or solution.correct_answer::integer not between 0 and 31
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 time number-input validation failed';
  end if;

  if (
    select count(*)
    from (
      select question.code
      from public.questions as question
      where question.unit_slug = 'grade-1-time-clock-calendar'
      group by question.code
      having count(*) > 1
    ) as duplicate_code
  ) <> 0
  or (
    select count(*)
    from (
      select question.prompt
      from public.questions as question
      where question.unit_slug = 'grade-1-time-clock-calendar'
      group by question.prompt
      having count(*) > 1
    ) as duplicate_prompt
  ) <> 0
  then
    raise exception 'Grade 1 time uniqueness validation failed';
  end if;

  select count(*)
  into v_invalid_count
  from public.questions as question
  join public.question_solutions as solution
    on solution.question_id = question.code
  where question.unit_slug = 'grade-1-time-clock-calendar'
    and question.visual_spec ->> 'kind' = 'ANALOG_CLOCK'
    and (
      (question.visual_spec ->> 'minute')::integer <> 0
      or (question.visual_spec ->> 'minuteAngle')::integer <> 0
      or (question.visual_spec ->> 'hourAngle')::integer
        <> mod((question.visual_spec ->> 'hour')::integer, 12) * 30
      or (
        question.question_type = 'NUMBER_INPUT'
        and solution.correct_answer::integer
          <> (question.visual_spec ->> 'hour')::integer
      )
      or (
        question.question_type = 'MULTIPLE_CHOICE'
        and question.options ->> solution.correct_answer
          <> (question.visual_spec ->> 'hour') || ' giờ'
      )
    );

  if v_invalid_count <> 0 then
    raise exception 'Grade 1 time clock answer validation failed';
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
