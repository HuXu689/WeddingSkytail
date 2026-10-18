CREATE TABLE admin_users (
    id integer PRIMARY KEY CHECK (id = 1),
    username varchar(100) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);