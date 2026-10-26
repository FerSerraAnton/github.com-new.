import { beforeAll, describe, expect, it } from "vitest";
import { as, createTestDb, createUser, type Db } from "./harness";
import { DEFAULT_ACTIVITIES, DEFAULT_CASE } from "@/lib/config/activities";

const TEACHER = "00000000-0000-0000-0000-00000000000a";
const OTHER_TEACHER = "00000000-0000-0000-0000-00000000000b";
const ANA = "00000000-0000-0000-0000-000000000001";
const BEA = "00000000-0000-0000-0000-000000000002";
const CARLOS = "00000000-0000-0000-0000-000000000003";
const LATE = ["00000000-0000-0000-0000-000000000004", "00000000-0000-0000-0000-000000000005"];

let db: Db;
let sessionId: string;
let code: string;
let teamA: string;
let teamB: string;
let activityNeed: string;
let anaP: string;
let carlosP: string;

async function one<T>(sql: string, params: unknown[] = []) {
  const r = await db.query<T>(sql, params);
  return r.rows[0];
}

beforeAll(async () => {
  db = await createTestDb();
  for (const u of [TEACHER, OTHER_TEACHER, ANA, BEA, CARLOS, ...LATE]) await createUser(db, u);
  await db.query("insert into public.teachers (user_id, name) values ($1,'Profe'),($2,'Otro')", [TEACHER, OTHER_TEACHER]);

  sessionId = await as(db, TEACHER, async () => {
    const r = await one<{ id: string }>("select public.create_session($1::jsonb) as id", [
      JSON.stringify({
        ...DEFAULT_CASE,
        max_per_team: 2,
        teams: [{ name: "Equipo 1" }, { name: "Equipo 2" }],
        activities: DEFAULT_ACTIVITIES,
      }),
    ]);
    return r.id;
  });
  const s = await one<{ code: string }>("select code from public.classroom_sessions where id=$1", [sessionId]);
  code = s.code;
  const teams = await db.query<{ id: string }>("select id from public.teams where session_id=$1 order by position", [sessionId]);
  [teamA, teamB] = teams.rows.map((t) => t.id);
  activityNeed = (await one<{ id: string }>("select id from public.activities where session_id=$1 and key='necesidad'", [sessionId])).id;
});

describe("creación de sesión", () => {
  it("crea 12 actividades, 2 equipos y un código legible", async () => {
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    const n = await one<{ n: number }>("select count(*)::int as n from public.activities where session_id=$1", [sessionId]);
    expect(n.n).toBe(12);
  });

  it("un alumno anónimo no puede crear sesiones", async () => {
    await expect(
      as(db, ANA, () => db.query("select public.create_session($1::jsonb)", [JSON.stringify({ title: "x", company: "x", scenario: "x", teams: [{ name: "a" }] })])),
    ).rejects.toThrow(/NOT_TEACHER/);
  });

  it("el código público solo expone datos básicos", async () => {
    const r = await as(db, null, () => one<{ j: Record<string, unknown> }>("select public.get_session_by_code($1) as j", [code.toLowerCase()]));
    expect(r.j.company).toBe("Decathlon");
    expect(r.j).not.toHaveProperty("share_token");
    expect(r.j).not.toHaveProperty("teacher_id");
  });
});

describe("unirse a la sesión", () => {
  it("permite elegir equipo y recuperar la sesión al recargar", async () => {
    anaP = await as(db, ANA, async () => (await one<{ id: string }>("select (public.join_session($1,'Ana',$2)).id", [code, teamA])).id);
    const again = await as(db, ANA, async () => (await one<{ id: string }>("select (public.join_session($1,'Ana',null)).id", [code])).id);
    expect(again).toBe(anaP);
  });

  it("la asignación automática equilibra los equipos", async () => {
    await as(db, BEA, () => db.query("select public.join_session($1,'Bea',null)", [code]));
    const bea = await one<{ team_id: string }>("select team_id from public.participants where user_id=$1", [BEA]);
    expect(bea.team_id).toBe(teamB);
    carlosP = await as(db, CARLOS, async () => (await one<{ id: string }>("select (public.join_session($1,'Carlos',null)).id", [code])).id);
  });

  it("no permite superar el máximo por equipo", async () => {
    await as(db, LATE[0], () => db.query("select public.join_session($1,'Dani',null)", [code])); // completa equipo 2
    await expect(as(db, LATE[1], () => db.query("select public.join_session($1,'Eva',$2)", [code, teamA]))).rejects.toThrow(/TEAM_FULL/);
    await expect(as(db, LATE[1], () => db.query("select public.join_session($1,'Eva',null)", [code]))).rejects.toThrow(/SESSION_FULL/);
  });
});

describe("permisos entre equipos", () => {
  beforeAll(async () => {
    await as(db, TEACHER, async () => {
      await db.query("update public.classroom_sessions set status='live', current_activity_id=$2 where id=$1", [sessionId, activityNeed]);
      await db.query("update public.activities set status='active' where id=$1", [activityNeed]);
    });
  });

  it("un alumno puede aportar en su equipo cuando la actividad está activa", async () => {
    await as(db, ANA, () =>
      db.query("insert into public.contributions (team_id, activity_id, participant_id, field_key, content) values ($1,$2,$3,'necesidad','Quiere empezar a correr')", [teamA, activityNeed, anaP]),
    );
    const n = await as(db, ANA, () => one<{ n: number }>("select count(*)::int n from public.contributions"));
    expect(n.n).toBe(1);
  });

  it("no puede escribir en otro equipo ni suplantar a otro participante", async () => {
    await expect(
      as(db, ANA, () => db.query("insert into public.contributions (team_id, activity_id, participant_id, field_key, content) values ($1,$2,$3,'x','intruso')", [teamB, activityNeed, anaP])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(db, ANA, () => db.query("insert into public.contributions (team_id, activity_id, participant_id, field_key, content) values ($1,$2,$3,'x','suplanto')", [teamB, activityNeed, carlosP])),
    ).rejects.toThrow(/row-level security/);
  });

  it("no ve los datos de otros equipos salvo comparación activada", async () => {
    const seen = await as(db, BEA, () => one<{ n: number }>("select count(*)::int n from public.contributions"));
    expect(seen.n).toBe(0);
    await as(db, TEACHER, () => db.query("update public.classroom_sessions set comparison_enabled=true where id=$1", [sessionId]));
    const seen2 = await as(db, BEA, () => one<{ n: number }>("select count(*)::int n from public.contributions"));
    expect(seen2.n).toBe(1);
    await as(db, TEACHER, () => db.query("update public.classroom_sessions set comparison_enabled=false where id=$1", [sessionId]));
  });

  it("no puede modificar ni borrar el trabajo de otros equipos", async () => {
    const upd = await as(db, BEA, () => db.query("update public.contributions set content='hackeado'"));
    expect(upd.affectedRows ?? 0).toBe(0);
    const del = await as(db, BEA, () => db.query("delete from public.contributions"));
    expect(del.affectedRows ?? 0).toBe(0);
  });

  it("no puede escribir cuando la actividad está bloqueada", async () => {
    await as(db, TEACHER, () => db.query("update public.activities set status='locked' where id=$1", [activityNeed]));
    await expect(
      as(db, ANA, () => db.query("insert into public.contributions (team_id, activity_id, participant_id, field_key, content) values ($1,$2,$3,'x','tarde')", [teamA, activityNeed, anaP])),
    ).rejects.toThrow(/row-level security/);
    await as(db, TEACHER, () => db.query("update public.activities set status='active' where id=$1", [activityNeed]));
  });

  it("los alumnos no pueden tocar la sesión, las actividades ni los equipos", async () => {
    const r1 = await as(db, ANA, () => db.query("update public.classroom_sessions set status='finished'"));
    const r2 = await as(db, ANA, () => db.query("update public.activities set status='completed'"));
    const r3 = await as(db, ANA, () => db.query("update public.participants set team_id=$1", [teamB]));
    expect([r1.affectedRows, r2.affectedRows, r3.affectedRows].map((x) => x ?? 0)).toEqual([0, 0, 0]);
    const tok = await as(db, ANA, () => one<{ share_token: string }>("select share_token from public.classroom_sessions"));
    expect(tok?.share_token).toBeTruthy(); // ve su sesión, pero sin poder modificarla
  });

  it("otro profesor no ve ni gestiona sesiones ajenas", async () => {
    const r = await as(db, OTHER_TEACHER, () => one<{ n: number }>("select count(*)::int n from public.classroom_sessions"));
    expect(r.n).toBe(0);
    const c = await as(db, OTHER_TEACHER, () => one<{ n: number }>("select count(*)::int n from public.contributions"));
    expect(c.n).toBe(0);
  });

  it("los votos de emoción son únicos por alumno y fase, y el equipo acuerda una emoción", async () => {
    const disc = (await one<{ id: string }>("select id from public.activities where session_id=$1 and key='descubrimiento'", [sessionId])).id;
    await as(db, TEACHER, () => db.query("update public.activities set status='active' where id=$1", [disc]));
    await as(db, ANA, async () => {
      await db.query(
        "insert into public.emotion_votes (team_id, activity_id, participant_id, phase_key, value, reason) values ($1,$2,$3,'descubrimiento',4,'Encuentra mucha información')",
        [teamA, disc, anaP],
      );
      await db.query(
        `insert into public.emotion_votes (team_id, activity_id, participant_id, phase_key, value, reason) values ($1,$2,$3,'descubrimiento',2,'Se agobia')
         on conflict (participant_id, phase_key) do update set value=excluded.value, reason=excluded.reason`,
        [teamA, disc, anaP],
      );
      await db.query(
        "insert into public.team_emotion_selections (team_id, phase_key, value, reason, chosen_by) values ($1,'descubrimiento',2,'Acordado',$2)",
        [teamA, anaP],
      );
    });
    const v = await one<{ value: number; n: number }>("select max(value) value, count(*)::int n from public.emotion_votes");
    expect(v).toEqual({ value: 2, n: 1 });
    await expect(
      as(db, BEA, async () => {
        const bp = (await one<{ id: string }>("select id from public.participants where user_id=$1", [BEA])).id;
        await db.query("insert into public.team_emotion_selections (team_id, phase_key, value, chosen_by) values ($1,'compra',5,$2)", [teamA, bp]);
      }),
    ).rejects.toThrow(/row-level security/);
  });

  it("un voto emocional se puede revisar desde la actividad de revisión aunque la fase esté cerrada", async () => {
    const disc = (await one<{ id: string }>("select id from public.activities where session_id=$1 and key='descubrimiento'", [sessionId])).id;
    const review = (await one<{ id: string }>("select id from public.activities where session_id=$1 and key='mapa_emocional'", [sessionId])).id;
    await as(db, TEACHER, () => db.query("update public.activities set status = case when id=$1 then 'completed' else 'active' end where id in ($1,$2)", [disc, review]));
    await as(db, ANA, () =>
      db.query(
        `insert into public.emotion_votes (team_id, activity_id, participant_id, phase_key, value, reason) values ($1,$2,$3,'descubrimiento',3,'Lo pensamos mejor')
         on conflict (participant_id, phase_key) do update set value=excluded.value, reason=excluded.reason, activity_id=excluded.activity_id`,
        [teamA, review, anaP],
      ),
    );
    const v = await one<{ value: number }>("select value from public.emotion_votes where participant_id=$1", [anaP]);
    expect(v.value).toBe(3);
  });

  it("solo los miembros del equipo marcan aportaciones para el mapa", async () => {
    const c = (await one<{ id: string }>("select id from public.contributions limit 1")).id;
    await expect(as(db, BEA, () => db.query("select public.set_contribution_selected($1, true)", [c]))).rejects.toThrow(/NOT_ALLOWED/);
    await as(db, ANA, () => db.query("select public.set_contribution_selected($1, true)", [c]));
    const s = await one<{ selected: boolean }>("select selected from public.contributions where id=$1", [c]);
    expect(s.selected).toBe(true);
  });

  it("el session_id no se puede falsear desde el cliente", async () => {
    await as(db, ANA, () =>
      db.query(
        "insert into public.contributions (session_id, team_id, activity_id, participant_id, field_key, content) values (gen_random_uuid(),$1,$2,$3,'objetivo','Correr 5 km')",
        [teamA, activityNeed, anaP],
      ),
    );
    const r = await one<{ ok: boolean }>("select bool_and(session_id=$1) ok from public.contributions", [sessionId]);
    expect(r.ok).toBe(true);
  });
});

describe("alta de profesores y enlace compartido", () => {
  it("solo registra correos autorizados con su código, ya confirmados y una sola vez", async () => {
    await db.exec("reset role; insert into public.teacher_allowlist (email, invite_code) values ('profe@uax.es', 'ABCD1234')");
    await expect(as(db, null, () => db.query("select public.register_teacher('intruso@x.com','12345678','ABCD1234')"))).rejects.toThrow(/TEACHER_NOT_ALLOWED/);
    await expect(as(db, null, () => db.query("select public.register_teacher('profe@uax.es','12345678','MAL00000')"))).rejects.toThrow(/TEACHER_NOT_ALLOWED/);
    await expect(as(db, null, () => db.query("select public.register_teacher('profe@uax.es','corta','abcd1234')"))).rejects.toThrow(/WEAK_PASSWORD/);
    await as(db, null, () => db.query("select public.register_teacher(' Profe@UAX.es ','contraseña-segura','abcd1234')"));
    const u = await one<{ ok: boolean; confirmed: boolean; teacher: boolean }>(
      `select encrypted_password = extensions.crypt('contraseña-segura', encrypted_password) ok, email_confirmed_at is not null confirmed,
              exists(select 1 from public.teachers t where t.user_id = u.id) teacher
       from auth.users u where email = 'profe@uax.es'`,
    );
    expect(u).toEqual({ ok: true, confirmed: true, teacher: true });
    await expect(as(db, null, () => db.query("select public.register_teacher('profe@uax.es','otra-clave-123','ABCD1234')"))).rejects.toThrow(/TEACHER_NOT_ALLOWED/);
  });

  it("el enlace compartido solo funciona si el profesor lo activa y no expone datos privados", async () => {
    const tok = (await one<{ share_token: string }>("select share_token from public.classroom_sessions where id=$1", [sessionId])).share_token;
    const off = await as(db, null, () => one<{ j: unknown }>("select public.get_shared_session($1) j", [tok]));
    expect(off.j).toBeNull();
    await as(db, TEACHER, () => db.query("update public.classroom_sessions set share_enabled=true where id=$1", [sessionId]));
    const on = await as(db, null, () => one<{ j: { work: { contributions: unknown[] } } }>("select public.get_shared_session($1) j", [tok]));
    const text = JSON.stringify(on.j);
    expect(text).toContain("Decathlon");
    expect(text).not.toContain(tok);
    expect(text).not.toContain(ANA);
    expect(text).not.toContain('"Ana"');
    expect(on.j.work.contributions.length).toBeGreaterThan(0);
  });
});
