alter table public.collection_items
add column if not exists guided_condition_grade text not null default 'auto',
add column if not exists guided_condition_issues text[] not null default '{}';

update public.collection_items
set guided_condition_grade = coalesce(guided_condition_grade, 'auto'),
    guided_condition_issues = coalesce(guided_condition_issues, '{}')
where guided_condition_grade is null
   or guided_condition_issues is null;

alter table public.collection_items
drop constraint if exists collection_items_guided_condition_grade_check;

alter table public.collection_items
add constraint collection_items_guided_condition_grade_check
check (guided_condition_grade in ('auto', 'mint', 'very_good', 'worn'));

alter table public.collection_items
drop constraint if exists collection_items_guided_condition_issues_check;

alter table public.collection_items
add constraint collection_items_guided_condition_issues_check
check (guided_condition_issues <@ array['folded', 'stained', 'damaged_edges']::text[]);