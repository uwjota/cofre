import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function asUser(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
beforeAll(async () => {
  await db.exec(
    `create schema auth; create role authenticated; create role anon; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
  );
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(
    `insert into auth.users(id,raw_user_meta_data) values ('${alice}','{"full_name":"Alice"}'),('${bob}','{"full_name":"Bob"}');`,
  );
}, 30000);
afterAll(() => db.close());
describe("Supabase schema: integridade e isolamento", () => {
  it("mantém schema e migração equivalentes", () =>
    expect(readFileSync("supabase/schema.sql", "utf8")).toBe(
      readFileSync("supabase/migrations/202610130001_initial.sql", "utf8"),
    ));
  it("cria perfis e isola a leitura", async () => {
    await asUser(alice);
    const result = await db.query("select * from public.profiles");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ full_name: "Alice" });
  });
  it("impede gravação em nome de outro usuário", async () => {
    await expect(
      db.query("insert into public.tasks(user_id,title) values ($1,$2)", [
        bob,
        "Ataque",
      ]),
    ).rejects.toThrow();
  });
  it("resolve links existentes, futuros e repetidos sem duplicar", async () => {
    await db.query(
      "insert into public.notes(id,title,content) values ($1,$2,$3)",
      [a, "Ideia", "[[DESTINO]] e [[ Destino ]] e [[Ideia]]"],
    );
    expect(
      (await db.query("select * from public.note_links")).rows,
    ).toHaveLength(0);
    await db.query("insert into public.notes(id,title) values ($1,$2)", [
      b,
      "Destino",
    ]);
    const result = await db.query(
      "select source_note_id,target_note_id from public.note_links",
    );
    expect(result.rows).toEqual([{ source_note_id: a, target_note_id: b }]);
  });
  it("não aceita títulos ambíguos dentro da mesma conta", async () => {
    await expect(
      db.query("insert into public.notes(title) values (' DESTINO ')"),
    ).rejects.toThrow();
  });
  it("remove links antigos e cria backlinks após editar", async () => {
    await db.query("update public.notes set content=$1 where id=$2", ["", a]);
    expect(
      (await db.query("select * from public.note_links")).rows,
    ).toHaveLength(0);
    await db.query("update public.notes set content=$1 where id=$2", [
      "[[Ideia]]",
      b,
    ]);
    expect(
      (
        await db.query(
          "select source_note_id,target_note_id from public.note_links",
        )
      ).rows,
    ).toEqual([{ source_note_id: b, target_note_id: a }]);
  });
  it("isola notas, links e gravações entre contas", async () => {
    await asUser(bob);
    expect((await db.query("select * from public.notes")).rows).toHaveLength(0);
    await db.query(
      "insert into public.notes(title,content) values ('Destino','[[Ideia]]')",
    );
    expect(
      (await db.query("select * from public.note_links")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.note_links(source_note_id,target_note_id) values ($1,$2)",
        [a, b],
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "update public.notes set content=$1 where id=$2 returning id",
          ["ataque", a],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("rejeita progresso inválido e valores financeiros negativos", async () => {
    await expect(
      db.query(
        "insert into public.projects(title,progress) values ('Teste',101)",
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into public.finances(description,amount,type) values ('Teste',-1,'expense')",
      ),
    ).rejects.toThrow();
  });
  it("renomear ou excluir remove conexões obsoletas", async () => {
    await asUser(alice);
    await db.query("update public.notes set title=$1 where id=$2", [
      "Novo título",
      a,
    ]);
    expect(
      (await db.query("select * from public.note_links")).rows,
    ).toHaveLength(0);
    await db.query("update public.notes set content=$1 where id=$2", [
      "[[Novo título]]",
      b,
    ]);
    expect(
      (await db.query("select * from public.note_links")).rows,
    ).toHaveLength(1);
    await db.query("delete from public.notes where id=$1", [a]);
    expect(
      (await db.query("select * from public.note_links")).rows,
    ).toHaveLength(0);
  });
  it("sessões Pomodoro são idempotentes pelo UUID", async () => {
    const sql =
      "insert into public.pomodoro_sessions(id) values ('33333333-3333-4333-8333-333333333333') on conflict (id) do update set duration_minutes=25";
    await db.exec(sql);
    await db.exec(sql);
    expect(
      (await db.query("select * from public.pomodoro_sessions")).rows,
    ).toHaveLength(1);
    await asUser(bob);
    expect(
      (await db.query("select * from public.pomodoro_sessions")).rows,
    ).toHaveLength(0);
  });
  it("bloqueia o acesso anônimo", async () => {
    await db.exec("reset role; set role anon;");
    await expect(db.query("select * from public.notes")).rejects.toThrow();
  });
});
