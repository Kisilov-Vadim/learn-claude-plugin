-- Migration: Add desired_score to topics, rename mastered → completed
-- Run this in the Supabase SQL editor.

-- ─── 1. Add desired_score column ─────────────────────────────────────────────
-- Optional (nullable = treat as 5). Constrained to 1–5. Default 5.
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS desired_score integer DEFAULT 5
  CHECK (desired_score IS NULL OR (desired_score >= 1 AND desired_score <= 5));

-- ─── 2. Add 'completed' to the status enum ───────────────────────────────────
-- PostgreSQL does not allow removing enum values without recreating the type,
-- so we add 'completed' and stop using 'mastered' going forward.
-- If your enum type has a different name, replace 'topic_status' below.
ALTER TYPE topic_status ADD VALUE IF NOT EXISTS 'completed';

-- ─── 3. Migrate existing data ────────────────────────────────────────────────
UPDATE topics
SET
  status       = 'completed',
  desired_score = 5
WHERE status = 'mastered';

-- ─── 4. RPC function changes needed in Supabase ──────────────────────────────
-- The following functions need manual updates in Supabase → Database → Functions:
--
-- a) add_topic — add p_desired_score parameter with same invariant check
--    Signature: add_topic(..., p_desired_score int DEFAULT 5)
--    Body (before INSERT):
--      IF COALESCE(p_score, 0) > COALESCE(p_desired_score, 5) THEN
--        RAISE EXCEPTION 'score (%) cannot exceed desiredScore (%)',
--          COALESCE(p_score, 0), COALESCE(p_desired_score, 5);
--      END IF;
--    Then INSERT desired_score = COALESCE(p_desired_score, 5)
--
-- b) update_topic — handle desiredScore in patch + enforce invariant
--    The key rule: after applying the patch, score must always be <= desiredScore.
--    If the patch violates this, raise an error — do not silently clamp.
--
--    Template logic to add inside update_topic before the UPDATE:
--
--      DECLARE
--        v_current_score     int;
--        v_current_desired   int;
--        v_final_score       int;
--        v_final_desired     int;
--      BEGIN
--        SELECT score, desired_score
--          INTO v_current_score, v_current_desired
--          FROM topics WHERE id = p_topic_id;
--
--        v_final_score   := COALESCE((p_patch->>'score')::int,        v_current_score);
--        v_final_desired := COALESCE((p_patch->>'desiredScore')::int,  v_current_desired);
--
--        IF v_final_score > v_final_desired THEN
--          RAISE EXCEPTION 'score (%) cannot exceed desiredScore (%)',
--            v_final_score, v_final_desired;
--        END IF;
--
--        -- then apply the patch as usual, including desiredScore if present
--        UPDATE topics SET
--          ...,
--          desired_score = COALESCE((p_patch->>'desiredScore')::int, desired_score)
--        WHERE id = p_topic_id;
--      END;
--
-- c) get_topic — include desired_score in the returned JSON
--
-- d) get_subject_context — exclude completed topics from all candidate lists
--    (dueTopics, nextUnstarted, practiceCandidate, deepDiveCandidate)
--    Completion % can count 'completed' topics as finished.
