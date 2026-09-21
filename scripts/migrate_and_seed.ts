import pg from 'pg';
import crypto from 'crypto';
import { initialOpportunities, initialSourceRegistry, defaultCandidateProfile } from '../src/data/initialData';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('No connection string found.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

async function runMigrationAndSeed() {
  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  try {
    // 1. Extensions
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);

    // 2. Ensure pipeline_runs table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source_platform TEXT DEFAULT 'ai_studio',
        trigger_type VARCHAR(50) NOT NULL,
        sources_checked INTEGER NOT NULL DEFAULT 0,
        opportunities_extracted INTEGER NOT NULL DEFAULT 0,
        qualifying_opportunities INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL,
        error_details TEXT,
        digest_delivered BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Ensure opportunities columns exist (without dropping or breaking existing columns)
    await client.query(`
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS score NUMERIC;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS match_breakdown JSONB;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS ai_explanation TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS requirements JSONB;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS skills TEXT[];
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS hard_eligibility TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS hard_eligibility_reasons JSONB;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS education_requirement TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS citizenship_requirement TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS work_type TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS is_remote BOOLEAN;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS sector TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS category TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS sub_category TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_name TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_tier TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS fingerprint TEXT;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'Discovered';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE;
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS embedding_gemini VECTOR(768);
      ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'ai_studio';
    `);

    // 4. Ensure users table has candidate Peter Grigoryev (benedictisaac258@gmail.com)
    const userRes = await client.query(`
      INSERT INTO users (id, email, name)
      VALUES ('00000000-0000-4000-a000-000000000001', 'benedictisaac258@gmail.com', 'Peter Grigoryev')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id;
    `);
    const candidateUserId = userRes.rows[0].id;
    console.log(`Candidate User ID: ${candidateUserId}`);

    // 5. Ensure candidate_profiles has Peter's profile
    await client.query(`
      INSERT INTO candidate_profiles (
        id, user_id, education, skills, experience, projects,
        career_targets, sectors, preferred_locations, remote_preference,
        work_authorization, eligibility_info, government_interests, policy_interests
      ) VALUES (
        '00000000-0000-4000-a000-000000000002',
        $1,
        $2::jsonb,
        $3,
        $4::jsonb,
        $5::jsonb,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::jsonb,
        $12,
        $13
      )
      ON CONFLICT (user_id) DO UPDATE SET
        skills = EXCLUDED.skills,
        career_targets = EXCLUDED.career_targets,
        sectors = EXCLUDED.sectors,
        preferred_locations = EXCLUDED.preferred_locations,
        remote_preference = EXCLUDED.remote_preference,
        updated_at = NOW();
    `, [
      candidateUserId,
      JSON.stringify([{
        degree: "Master's",
        program: defaultCandidateProfile.currentProgram,
        school: defaultCandidateProfile.school,
        graduationDate: defaultCandidateProfile.expectedGraduation,
      }]),
      [...defaultCandidateProfile.primarySkills, ...defaultCandidateProfile.secondarySkills],
      JSON.stringify([{ role: 'Graduate Research Assistant', org: 'Rutgers University', years: 1.5 }]),
      JSON.stringify([{ name: 'Cyber Threat Analysis Lab', technologies: ['Splunk', 'Python', 'NIST CSF'] }]),
      defaultCandidateProfile.careerTracks,
      defaultCandidateProfile.targetSectors,
      defaultCandidateProfile.targetLocations,
      'HYBRID',
      defaultCandidateProfile.citizenship,
      JSON.stringify({
        securityClearance: 'Eligible for Secret / Top Secret',
        graduationDate: defaultCandidateProfile.expectedGraduation,
        degreeLevel: "Master's",
      }),
      ['Federal Cyber Defense', 'Critical Infrastructure', 'CISA', 'National Security'],
      ['Cyber Policy', 'Digital Governance', 'Risk Management'],
    ]);

    // 6. Seed authoritative sources
    for (const src of initialSourceRegistry) {
      const srcId = crypto.createHash('md5').update(src.name).digest('hex');
      const formattedUuid = `${srcId.slice(0, 8)}-${srcId.slice(8, 12)}-4${srcId.slice(13, 16)}-a${srcId.slice(17, 20)}-${srcId.slice(20, 32)}`;
      await client.query(`
        INSERT INTO sources (id, name, url, source_type, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          url = EXCLUDED.url,
          source_type = EXCLUDED.source_type,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();
      `, [
        formattedUuid,
        src.name,
        src.apiUrl || 'https://www.usajobs.gov',
        src.category || 'GOVERNMENT',
        JSON.stringify({ tier: src.tier, reliability: src.reliabilityScore, accessMethod: src.accessMethod }),
      ]);
    }

    // 7. Seed categories from taxonomy
    const categories = [
      'work', 'technical_experience', 'cybersecurity', 'government',
      'policy', 'international_affairs', 'fellowship', 'education', 'events', 'news'
    ];
    for (const cat of categories) {
      const catId = crypto.createHash('md5').update(cat).digest('hex');
      const catUuid = `${catId.slice(0, 8)}-${catId.slice(8, 12)}-4${catId.slice(13, 16)}-a${catId.slice(17, 20)}-${catId.slice(20, 32)}`;
      await client.query(`
        INSERT INTO opportunity_categories (id, name, metadata)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (name) DO NOTHING;
      `, [catUuid, cat, JSON.stringify({ slug: cat })]);
    }

    // 8. Seed initial opportunities into PostgreSQL opportunities table
    const defaultSourceIdRes = await client.query(`SELECT id FROM sources LIMIT 1`);
    const defaultSourceId = defaultSourceIdRes.rows[0]?.id;

    for (const opp of initialOpportunities) {
      // Find matching source_id
      const matchingSrcRes = await client.query(`SELECT id FROM sources WHERE name ILIKE $1 LIMIT 1`, [`%${opp.sourceName}%`]);
      const resolvedSourceId = matchingSrcRes.rows[0]?.id || defaultSourceId;

      // Ensure stable UUID
      let oppUuid: string;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opp.id)) {
        oppUuid = opp.id;
      } else {
        const hash = crypto.createHash('md5').update(opp.id).digest('hex');
        oppUuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      }

      await client.query(`
        INSERT INTO opportunities (
          id, stable_id, source_id, external_id, title, organization, description,
          url, location, is_remote, opportunity_type, status, application_deadline,
          deadline_type, requirements, skills, education_requirement, citizenship_requirement,
          sector, category, sub_category, source_name, source_tier, score,
          match_breakdown, ai_explanation, source_platform, first_seen_at, last_seen_at,
          application_status, priority, is_saved
        ) VALUES (
          $1, $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14::jsonb, $15, $16, $17,
          $18, $19, $20, $21, $22, $23,
          $24::jsonb, $25, 'ai_studio', NOW(), NOW(),
          $26, $27, $28
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          organization = EXCLUDED.organization,
          description = EXCLUDED.description,
          score = EXCLUDED.score,
          match_breakdown = EXCLUDED.match_breakdown,
          ai_explanation = EXCLUDED.ai_explanation,
          updated_at = NOW();
      `, [
        oppUuid,
        resolvedSourceId,
        opp.externalId || opp.id,
        opp.title,
        opp.organization,
        opp.description,
        opp.url,
        opp.location,
        opp.isRemote,
        opp.workType || 'Internship',
        opp.status || 'OPEN',
        opp.applicationDeadline ? new Date(opp.applicationDeadline).toISOString() : null,
        opp.deadlineType || 'FIXED',
        JSON.stringify(opp.requirements || []),
        opp.skills || [],
        opp.educationRequirement || "Master's Degree Preferred",
        opp.citizenshipRequirement || 'US_CITIZEN_REQUIRED',
        opp.sector,
        opp.category,
        opp.subCategory,
        opp.sourceName,
        opp.sourceTier,
        opp.matchBreakdown.finalScore,
        JSON.stringify(opp.matchBreakdown),
        opp.aiExplanation || '',
        opp.applicationStatus || 'Discovered',
        opp.priority || 'Medium',
        opp.isSaved || false,
      ]);
    }

    console.log('Database schema successfully migrated and seeded with initial authoritative dataset!');
  } finally {
    client.release();
  }
}

runMigrationAndSeed().then(() => {
  console.log('Migration completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
