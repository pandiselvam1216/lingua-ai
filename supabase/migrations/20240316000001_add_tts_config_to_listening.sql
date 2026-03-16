-- Migration to add tts_config to listening_modules table
ALTER TABLE listening_modules ADD COLUMN tts_config TEXT;
ALTER TABLE listening_modules ALTER COLUMN audio_url DROP NOT NULL;
