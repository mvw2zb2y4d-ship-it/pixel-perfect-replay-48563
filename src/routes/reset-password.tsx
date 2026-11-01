import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Screen, Label } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [{ title: "Новый пароль — Мой день" }, { name: "description", content: "Восстановление доступа к личному планировщику." }, { property: "og:title", content: "Новый пароль — Мой день" }, { property: "og:description", content: "Восстановление доступа к личному планировщику." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: ResetPassword });
function ResetPassword() {
  const [password, setPassword] = useState(""); const [message, setMessage] = useState("");
  return <Screen title="Новый пароль"><div className="space-y-3"><label className="block"><Label>Новый пароль</Label><input type="password" className="field" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><Button disabled={password.length < 8} onClick={async () => { const { error } = await supabase.auth.updateUser({ password }); setMessage(error ? "Не удалось сменить пароль. Откройте ссылку из письма ещё раз." : "Пароль изменён."); }}>Сохранить пароль</Button><p role="status" className="text-sm">{message}</p><Link to="/settings" className="block text-primary">Настройки аккаунта</Link></div></Screen>;
}