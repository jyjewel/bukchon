-- 도서관 디자인에 "마법의 성"을 추가한다(마을 장이 고른다)
alter table public.villages drop constraint if exists villages_library_style_check;
alter table public.villages add constraint villages_library_style_check check (library_style in ('classic', 'bicheondang', 'castle'));
