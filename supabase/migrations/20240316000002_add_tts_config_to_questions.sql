-- Migration to add tts_config to questions table
ALTER TABLE questions ADD COLUMN tts_config TEXT;
