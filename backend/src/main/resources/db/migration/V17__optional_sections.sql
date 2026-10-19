CREATE TABLE wedding_sections (
 surface varchar(12) NOT NULL CHECK(surface IN ('DRAFT','PUBLISHED')),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 19),
 kind varchar(20) NOT NULL CHECK(kind IN ('INTRO','FAMILY','CEREMONY','TIMELINE','DRESS_CODE')),
 audience varchar(10) NOT NULL CHECK(audience IN ('PUBLIC','PRIVATE')),
 enabled boolean NOT NULL DEFAULT false,
 title varchar(200) NOT NULL,
 body varchar(2000) NOT NULL,
 starts_at timestamptz,
 color varchar(7),
 PRIMARY KEY(surface,position),
 CHECK(kind<>'TIMELINE' OR starts_at IS NOT NULL),
 CHECK(color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);
ALTER TABLE wedding ADD COLUMN template_version integer NOT NULL DEFAULT 1 CHECK(template_version=1);
ALTER TABLE wedding ADD COLUMN content_schema_version integer NOT NULL DEFAULT 1 CHECK(content_schema_version=1);