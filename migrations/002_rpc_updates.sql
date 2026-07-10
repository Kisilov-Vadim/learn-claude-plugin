-- RPC function updates for desiredScore + completed status
-- Run each block separately in the Supabase SQL editor (or all at once).

-- ─── 1. add_topic ─────────────────────────────────────────────────────────────
-- Adds p_desired_score param (optional, default 5). Validates range 1–5.
-- Initial score is always 0, so score <= desiredScore is always satisfied on create.

CREATE OR REPLACE FUNCTION public.add_topic(
  p_subject_id    uuid,
  p_name          text,
  p_level         text,
  p_prerequisites uuid[],
  p_resources     jsonb,
  p_desired_score integer DEFAULT 5
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_topic     topics%ROWTYPE;
  v_max_order INTEGER;
  v_desired   INTEGER;
BEGIN
  v_desired := COALESCE(p_desired_score, 5);

  IF v_desired < 1 OR v_desired > 5 THEN
    RAISE EXCEPTION 'desiredScore must be between 1 and 5, got %', v_desired;
  END IF;

  SELECT COALESCE(MAX(order_index) + 1, 0) INTO v_max_order
  FROM topics WHERE subject_id = p_subject_id AND user_id = auth.uid();

  INSERT INTO topics (user_id, subject_id, name, level, prerequisites, resources, order_index, desired_score)
  VALUES (auth.uid(), p_subject_id, p_name, p_level,
          COALESCE(p_prerequisites, '{}'), COALESCE(p_resources, '[]'), v_max_order, v_desired)
  RETURNING * INTO v_topic;

  RETURN json_build_object(
    'id',           v_topic.id,
    'subjectId',    v_topic.subject_id,
    'name',         v_topic.name,
    'level',        v_topic.level,
    'score',        v_topic.score,
    'status',       v_topic.status,
    'desiredScore', v_topic.desired_score,
    'orderIndex',   v_topic.order_index
  );
END;
$function$;

-- ─── 2. update_topic ──────────────────────────────────────────────────────────
-- Adds desiredScore to patchable fields.
-- Enforces invariant: final score <= final desiredScore. Raises if violated.

CREATE OR REPLACE FUNCTION public.update_topic(p_topic_id uuid, p_patch jsonb)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_topic           topics%ROWTYPE;
  v_current_score   integer;
  v_current_desired integer;
  v_final_score     integer;
  v_final_desired   integer;
BEGIN
  SELECT score, desired_score
    INTO v_current_score, v_current_desired
    FROM topics
    WHERE id = p_topic_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topic not found: %', p_topic_id;
  END IF;

  v_final_score   := COALESCE((p_patch->>'score')::integer,       v_current_score);
  v_final_desired := COALESCE((p_patch->>'desiredScore')::integer, v_current_desired);

  IF v_final_score > v_final_desired THEN
    RAISE EXCEPTION 'score (%) cannot exceed desiredScore (%)', v_final_score, v_final_desired;
  END IF;

  UPDATE topics SET
    score         = COALESCE((p_patch->>'score')::INTEGER,        score),
    status        = COALESCE( p_patch->>'status',                  status),
    next_review   = COALESCE((p_patch->>'nextReview')::DATE,       next_review),
    last_reviewed = COALESCE((p_patch->>'lastReviewed')::DATE,     last_reviewed),
    best_method   = COALESCE( p_patch->>'bestMethod',              best_method),
    review_count  = COALESCE((p_patch->>'reviewCount')::INTEGER,   review_count),
    desired_score = COALESCE((p_patch->>'desiredScore')::INTEGER,  desired_score)
  WHERE id = p_topic_id AND user_id = auth.uid()
  RETURNING * INTO v_topic;

  RETURN json_build_object(
    'id',           v_topic.id,
    'score',        v_topic.score,
    'status',       v_topic.status,
    'nextReview',   v_topic.next_review,
    'lastReviewed', v_topic.last_reviewed,
    'bestMethod',   v_topic.best_method,
    'reviewCount',  v_topic.review_count,
    'desiredScore', v_topic.desired_score
  );
END;
$function$;

-- ─── 3. get_topic ─────────────────────────────────────────────────────────────
-- Adds desiredScore to the returned object.

CREATE OR REPLACE FUNCTION public.get_topic(p_topic_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $function$
SELECT json_build_object(
  'id',           t.id,
  'subjectId',    t.subject_id,
  'name',         t.name,
  'level',        t.level,
  'score',        t.score,
  'status',       t.status,
  'desiredScore', t.desired_score,
  'prerequisites',t.prerequisites,
  'resources',    t.resources,
  'bestMethod',   t.best_method,
  'reviewCount',  t.review_count,
  'nextReview',   t.next_review,
  'lastReviewed', t.last_reviewed,
  'touches', COALESCE((
    SELECT json_agg(json_build_object(
      'id',            tc.id,
      'method',        tc.method,
      'scoreBefore',   tc.score_before,
      'scoreAfter',    tc.score_after,
      'effectiveness', tc.effectiveness,
      'agentComment',  tc.agent_comment,
      'createdAt',     tc.created_at
    ) ORDER BY tc.created_at DESC)
    FROM (
      SELECT * FROM touches
      WHERE topic_id = t.id AND user_id = auth.uid()
      ORDER BY created_at DESC
      LIMIT 5
    ) tc
  ), '[]'::json)
)
FROM topics t WHERE t.id = p_topic_id AND t.user_id = auth.uid();
$function$;

-- ─── 4. get_subject_context ───────────────────────────────────────────────────
-- Excludes completed topics from all candidate lists.
-- practiceCandidate and deepDiveCandidate now use score < desired_score
-- instead of the hardcoded score < 4.
-- Candidate objects include desiredScore so the agent has it in context.

CREATE OR REPLACE FUNCTION public.get_subject_context(p_subject_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $function$
SELECT json_build_object(
  'id',           s.id,
  'name',         s.name,
  'streak',       s.streak,
  'currentLevel', s.current_level,
  'methodEffectiveness', COALESCE((
    SELECT json_object_agg(me.method, json_build_object(
      'avgScoreDelta', me.avg_score_delta,
      'touches',       me.touches,
      'retired',       me.retired
    ))
    FROM method_effectiveness me
    WHERE me.subject_id = p_subject_id AND me.user_id = auth.uid()
  ), '{}'::json),
  'dueTopics', COALESCE((
    SELECT json_agg(json_build_object(
      'id',           t.id,
      'name',         t.name,
      'score',        t.score,
      'level',        t.level,
      'desiredScore', t.desired_score
    ) ORDER BY t.score ASC)
    FROM topics t
    WHERE t.subject_id = p_subject_id
      AND t.next_review <= CURRENT_DATE
      AND t.status != 'completed'
      AND t.user_id = auth.uid()
  ), '[]'::json),
  'nextUnstarted', (
    SELECT json_build_object(
      'id',           t.id,
      'name',         t.name,
      'score',        t.score,
      'level',        t.level,
      'desiredScore', t.desired_score
    )
    FROM topics t
    WHERE t.subject_id = p_subject_id
      AND t.status = 'not-started'
      AND t.level = s.current_level
      AND t.user_id = auth.uid()
    ORDER BY t.order_index ASC LIMIT 1
  ),
  'practiceCandidate', (
    SELECT json_build_object(
      'id',           t.id,
      'name',         t.name,
      'score',        t.score,
      'level',        t.level,
      'desiredScore', t.desired_score
    )
    FROM topics t
    WHERE t.subject_id = p_subject_id
      AND t.score < t.desired_score
      AND t.status NOT IN ('not-started', 'completed')
      AND (t.last_reviewed < CURRENT_DATE OR t.last_reviewed IS NULL)
      AND t.user_id = auth.uid()
    ORDER BY t.score ASC LIMIT 1
  ),
  'deepDiveCandidate', (
    SELECT json_build_object(
      'id',           t.id,
      'name',         t.name,
      'score',        t.score,
      'level',        t.level,
      'desiredScore', t.desired_score
    )
    FROM topics t
    WHERE t.subject_id = p_subject_id
      AND t.score < t.desired_score
      AND t.status NOT IN ('not-started', 'completed')
      AND t.user_id = auth.uid()
    ORDER BY t.score ASC LIMIT 1
  )
)
FROM subjects s WHERE s.id = p_subject_id AND s.user_id = auth.uid();
$function$;
