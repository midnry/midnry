-- Audience tags for member apps, stored as comma-separated text ("business,everyday").
-- Built-in apps are tagged in code (src/lib/audience-tags.ts).
alter table submissions add column if not exists audiences text not null default '';
alter table submissions add column if not exists fields text not null default '';
alter table submissions add column if not exists published_audiences text;
alter table submissions add column if not exists published_fields text;

-- Existing apps take the tag of their genre section's group.
update submissions set audiences = case
    when genre in ('agro', 'beauty', 'freelance', 'kitchen', 'retail', 'sellers', 'work') then 'business'
    when genre in ('elder-health', 'elder-money', 'family', 'hobbies', 'safety') then 'everyday'
    when genre in ('books', 'clinic', 'code', 'creatives', 'design', 'developers', 'health', 'marketing', 'money', 'practice', 'teaching') then 'professionals'
    when genre in ('accounting', 'arts', 'computing', 'engineering', 'focus', 'law', 'medicine', 'science', 'writing') then 'students'
    else ''
  end
where audiences = '';

update submissions set published_audiences = case
    when published_genre in ('agro', 'beauty', 'freelance', 'kitchen', 'retail', 'sellers', 'work') then 'business'
    when published_genre in ('elder-health', 'elder-money', 'family', 'hobbies', 'safety') then 'everyday'
    when published_genre in ('books', 'clinic', 'code', 'creatives', 'design', 'developers', 'health', 'marketing', 'money', 'practice', 'teaching') then 'professionals'
    when published_genre in ('accounting', 'arts', 'computing', 'engineering', 'focus', 'law', 'medicine', 'science', 'writing') then 'students'
    else ''
  end, published_fields = ''
where published_html is not null and published_audiences is null;
