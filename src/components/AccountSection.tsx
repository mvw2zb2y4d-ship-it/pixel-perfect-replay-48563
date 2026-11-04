import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { exportBackup, importLegacy, resolveConflict, useSync } from "@/lib/cloud-sync";
import { Button } from "@/components/ui/button";
import { Label } from "./ui-kit";
import { RestoreBackup } from "./RestoreBackup";
import "@lovable.dev/cloud-auth-js/styles.css";

export function AccountSection() {
  const sync = useSync();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setMessage("");
    const { error } = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }) : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false); setMessage(error ? "Не удалось войти. Проверьте данные и подтверждение почты." : signup ? "Подтвердите почту по ссылке в письме." : "");
  }
  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) setMessage("Не удалось войти. Попробуйте ещё раз.");
  }
  return <div className="space-y-3">
    {sync.userId ? <>
      <p className="break-all text-sm">{sync.email}</p><p className="text-xs text-muted-foreground" role="status">{sync.status}</p>
      {sync.status.startsWith("Конфликт") && <div className="space-y-2"><Button variant="secondary" className="h-auto w-full whitespace-normal" onClick={() => { if (confirm("Заменить данные на этом устройстве облачной версией? Сначала скачайте копию, если хотите сохранить местные изменения.")) void resolveConflict(false); }}>Загрузить версию из Cloud</Button><Button variant="outline" className="h-auto w-full whitespace-normal" onClick={() => { if (confirm("Заменить облачную версию данными с этого устройства? Изменения с другого устройства будут заменены.")) void resolveConflict(true); }}>Сохранить эту версию в Cloud</Button></div>}
      {sync.legacy && <Button className="h-auto w-full whitespace-normal" variant="secondary" onClick={() => confirm("Добавить старые записи с этого устройства в ваш аккаунт? Подтвердите, что они принадлежат вам.") && importLegacy()}>Перенести мои старые записи</Button>}
      <Button variant="outline" onClick={exportBackup}>Скачать копию данных</Button>
      <Button variant="ghost" onClick={async () => { if (sync.status !== "Сохранено в Cloud" && !confirm("Есть несохранённые в Cloud изменения. Они останутся на этом устройстве. Выйти?")) return; await supabase.auth.signOut(); }}>Выйти</Button>
    </> : <>
      <p className="text-xs text-muted-foreground">Без входа записи остаются на этом устройстве. Для личного сохранения в Cloud войдите в аккаунт.</p>
      <label className="block"><Label>Почта</Label><input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label className="block"><Label>Пароль</Label><input type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} /></label>
      <Button className="w-full" disabled={busy || !email || password.length < 8} onClick={submit}>{signup ? "Зарегистрироваться" : "Войти"}</Button>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setSignup(!signup)}>{signup ? "Уже есть аккаунт" : "Создать аккаунт"}</Button><Button variant="ghost" onClick={async () => { if (!email) { setMessage("Укажите почту."); return; } const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); setMessage(error ? "Не удалось отправить письмо." : "Ссылка для смены пароля отправлена."); }}>Забыли пароль?</Button></div>
      <Button variant="secondary" className="w-full" onClick={() => social("google")}>Продолжить с Google</Button>
      <Button className="lovable-auth-button w-full" onClick={() => social("lovable")}>Продолжить с Lovable</Button>
      <Button variant="outline" onClick={exportBackup}>Скачать копию данных</Button>
    </>}
    <RestoreBackup />
    {message && <p className="text-sm text-warning" role="status">{message}</p>}
  </div>;
}