-- Add unique constraint to prevent duplicate doc_sequence rows for same template+year
ALTER TABLE doc_sequence ADD UNIQUE INDEX uk_doc_seq_template_year (template_code, year);
