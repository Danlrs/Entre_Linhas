-- Executar antes de publicar o backend. Não altera senhas nem vincula contas por e-mail.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_google_subject_unique ON usuarios (google_subject);
