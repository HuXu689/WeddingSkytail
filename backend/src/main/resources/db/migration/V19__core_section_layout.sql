CREATE TABLE wedding_layout (
 surface varchar(12) NOT NULL CHECK(surface IN ('DRAFT','PUBLISHED')),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 5),
 section varchar(20) NOT NULL CHECK(section IN ('MUSIC','COUNTDOWN','STORY','CONTENT','ALBUM','THANKS')),
 enabled boolean NOT NULL DEFAULT true,
 PRIMARY KEY(surface,section),
 UNIQUE(surface,position)
);
INSERT INTO wedding_layout(surface,position,section)
 SELECT surface,position,section FROM (VALUES('DRAFT'),('PUBLISHED')) surfaces(surface)
 CROSS JOIN (VALUES(0,'MUSIC'),(1,'COUNTDOWN'),(2,'STORY'),(3,'CONTENT'),(4,'ALBUM'),(5,'THANKS')) sections(position,section);