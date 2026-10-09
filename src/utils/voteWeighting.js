// Balances voting power against team size. Without this, a 4-person team
// that all vote for their own project effectively casts 4 votes against a
// solo builder's 1, regardless of how good either project actually is.
//
// Each event member's vote weight is 1 / (size of the smallest team they
// belong to at this event), so a team's combined self-votes are always
// worth the same as a single solo voter's vote.
//
// This is a WITH-clause fragment (no leading "WITH", no trailing comma) —
// interpolate it into a query's own WITH clause and join the resulting
// `member_weights` CTE on `email = <voter email column>`, using
// `1.0 / COALESCE(member_weights.team_size, 1)` as the per-vote weight
// (COALESCE handles voters who aren't on any team for this event — they
// vote at full weight since there's no team to balance against).
//
// Requires exactly one query parameter: $1 = the event id.
const MEMBER_WEIGHT_CTE = `
  event_ideas AS (
    SELECT
      i.id AS idea_id,
      i.email AS owner_email,
      -- Some legacy rows store a literal "{}" artifact instead of an empty
      -- string (same quirk the rest of the codebase strips before parsing
      -- contributors) — strip it here too so it isn't counted as a member.
      REPLACE(COALESCE(m.contributors, i.contributors), '{}', '') AS contributors
    FROM ideas i
    LEFT JOIN idea_event_metadata m
      ON m.idea_id = i.id AND m.event_id = $1::integer
    WHERE (',' || i.event_id || ',') LIKE '%,' || $1::text || ',%'
  ),
  team_members AS (
    SELECT idea_id, TRIM(member_email) AS member_email
    FROM (
      SELECT idea_id, owner_email AS member_email FROM event_ideas
      UNION ALL
      SELECT idea_id, unnest(string_to_array(contributors, ',')) AS member_email FROM event_ideas
    ) raw_members
    WHERE TRIM(COALESCE(member_email, '')) != ''
  ),
  team_sizes AS (
    SELECT idea_id, COUNT(DISTINCT member_email) AS team_size
    FROM team_members
    GROUP BY idea_id
  ),
  member_weights AS (
    SELECT tm.member_email AS email, MIN(ts.team_size)::float AS team_size
    FROM team_members tm
    JOIN team_sizes ts ON ts.idea_id = tm.idea_id
    GROUP BY tm.member_email
  )
`;

module.exports = { MEMBER_WEIGHT_CTE };
