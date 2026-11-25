import { desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { setUserRole } from "../actions";
import { H1, Saved } from "@/components/admin/ui";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const users = await db
    .select({ id: s.users.id, name: s.users.name, email: s.users.email, role: s.users.role, createdAt: s.users.createdAt })
    .from(s.users)
    .orderBy(desc(s.users.createdAt))
    .limit(500);
  return (
    <>
      <H1 sub="Клиенты видят только названия своих формул, записи и заказы. Парфюмеры — раздел «Студия» (записи, анкеты, формулы). Администраторы — всё.">Пользователи</H1>
      <Saved show={sp.saved === "1"} />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[620px]">
          <thead className="text-left text-xs text-muted"><tr className="border-b border-line"><th className="p-3">Имя</th><th className="p-3">Email</th><th className="p-3">Регистрация</th><th className="p-3">Роль</th></tr></thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 text-muted">{u.createdAt.toLocaleDateString("ru-RU")}</td>
                <td className="p-3">
                  <form action={setUserRole} className="flex gap-2 items-center">
                    <input type="hidden" name="id" value={u.id} />
                    <label className="sr-only" htmlFor={`r-${u.id}`}>Роль</label>
                    <select id={`r-${u.id}`} name="role" defaultValue={u.role} className="field py-1.5 min-h-[38px] w-auto">
                      <option value="USER">Клиент</option>
                      <option value="PERFUMER">Парфюмер</option>
                      <option value="ADMIN">Администратор</option>
                    </select>
                    <button className="btn btn-ghost btn-sm">OK</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
