ALTER TABLE wedding
 ADD COLUMN draft_theme varchar(20) NOT NULL DEFAULT 'ELEGANT',
 ADD COLUMN theme varchar(20) NOT NULL DEFAULT 'ELEGANT',
 ADD COLUMN draft_accent varchar(20) NOT NULL DEFAULT 'OLIVE',
 ADD COLUMN accent varchar(20) NOT NULL DEFAULT 'OLIVE',
 ADD COLUMN draft_story varchar(4000) NOT NULL DEFAULT '',
 ADD COLUMN story varchar(4000) NOT NULL DEFAULT '',
 ADD COLUMN draft_footer varchar(500) NOT NULL DEFAULT 'Cảm ơn bạn đã là một phần trong ngày hạnh phúc của chúng mình.',
 ADD COLUMN footer varchar(500) NOT NULL DEFAULT 'Cảm ơn bạn đã là một phần trong ngày hạnh phúc của chúng mình.',
 ADD COLUMN draft_show_story boolean NOT NULL DEFAULT true,
 ADD COLUMN show_story boolean NOT NULL DEFAULT true,
 ADD CONSTRAINT wedding_theme_check CHECK (theme IN ('ELEGANT','TRADITIONAL','MODERN') AND draft_theme IN ('ELEGANT','TRADITIONAL','MODERN')),
 ADD CONSTRAINT wedding_accent_check CHECK (accent IN ('OLIVE','BURGUNDY','NAVY') AND draft_accent IN ('OLIVE','BURGUNDY','NAVY'));