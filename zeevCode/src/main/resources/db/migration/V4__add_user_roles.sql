ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';
UPDATE users SET role = 'ADMIN' WHERE email = 'sarzeev@gmail.com';
