import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { storage } from "./lib/storage.js";
import { deriveKey, encryptJSON, decryptJSON } from "./lib/crypto.js";
import { defaultVault, processPeriods, validateTransaction, resolveRecurringNotification, recordSuccessfulOpen } from "./lib/finance.js";
import { useThemeVars } from "./theme.js";

import LoginScreen from "./components/LoginScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import TransactionsView from "./components/TransactionsView.jsx";
import BudgetView from "./components/BudgetView.jsx";
import SavingsView from "./components/SavingsView.jsx";
import AnalyticsView from "./components/AnalyticsView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import QuickAdd from "./components/QuickAdd.jsx";
import PrintSummary from "./components/PrintSummary.jsx";
import { NAV, BottomNav } from "./components/Nav.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import NotificationCenter from "./components/NotificationCenter.jsx";

export default function App() {
  const [phase, setPhase] = useState("loading"); // loading | create | unlock | app
  const [metaUsername, setMetaUsername] = useState("");
  const [error, setError] = useState("");
  const [cryptoKey, setCryptoKey] = useState(null);
  const [vault, setVault] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [now, setNow] = useState(new Date());
  const [nextPhase, setNextPhase] = useState("create");
  const lastActivity = useRef(Date.now());

  const theme = useThemeVars(vault?.settings || { theme: "jarvis", accent: "#38bdf8" });

  // clock tick (also drives period rollover checks)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // bootstrap: check for existing vault meta
  useEffect(() => {
    (async () => {
      try {
        const meta = await storage.get("garph_meta");
        if (meta && meta.value) {
          const parsedMeta = JSON.parse(meta.value);
          setMetaUsername(parsedMeta.username);
          setNextPhase("unlock");
        } else {
          setNextPhase("create");
        }
      } catch {
        setNextPhase("create");
      }
    })();
  }, []);

  const persist = useCallback(async (v, key) => {
    const k = key || cryptoKey;
    if (!k) return;
    const enc = await encryptJSON(k, v);
    try { await storage.set("garph_vault", JSON.stringify(enc)); } catch { /* best effort */ }
  }, [cryptoKey]);

  const runProcessingAndSave = useCallback(async (v, key) => {
    const openedAt = new Date();
    const processed = recordSuccessfulOpen(processPeriods(v, openedAt), openedAt);
    setVault(processed);
    await persist(processed, key);
  }, [persist]);

  const onCreate = async (username, password) => {
    setError("");
    const { key, saltB64 } = await deriveKey(password, null);
    await storage.set("garph_meta", JSON.stringify({ username, salt: saltB64 }));
    setCryptoKey(key);
    await runProcessingAndSave(defaultVault(username), key);
    setPhase("app");
  };

  const onUnlock = async (password) => {
    setError("");
    try {
      const metaRaw = await storage.get("garph_meta");
      const meta = JSON.parse(metaRaw.value);
      const { key } = await deriveKey(password, meta.salt);
      const vaultRaw = await storage.get("garph_vault");
      const v = await decryptJSON(key, JSON.parse(vaultRaw.value));
      setCryptoKey(key);
      await runProcessingAndSave(v, key);
      setPhase("granting");
      window.setTimeout(() => setPhase("app"), theme.reducedMotion ? 160 : 420);
    } catch {
      setError("Incorrect password");
    }
  };

  const onChangePassword = async (curPass, newPass) => {
    try {
      const metaRaw = await storage.get("garph_meta");
      const meta = JSON.parse(metaRaw.value);
      const { key: curKey } = await deriveKey(curPass, meta.salt);
      const vaultRaw = await storage.get("garph_vault");
      await decryptJSON(curKey, JSON.parse(vaultRaw.value)); // verify current password
      const { key: newKey, saltB64: newSalt } = await deriveKey(newPass, null);
      await storage.set("garph_meta", JSON.stringify({ username: meta.username, salt: newSalt }));
      setCryptoKey(newKey);
      await persist(vault, newKey);
      return true;
    } catch {
      return false;
    }
  };

  // mutate helper: fn receives a draft to mutate, we clone/apply/save
  const update = useCallback((fn) => {
    setVault((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      fn(draft);
      persist(draft);
      return draft;
    });
  }, [persist]);

  const addTransaction = (tx) => {
    const validationError = validateTransaction(vault, tx);
    if (validationError) return validationError;
    update((d) => { d.transactions.push(tx); });
    setShowAdd(false);
    return null;
  };

  const resolveNotification = (id, action) => {
    const updated = resolveRecurringNotification(vault, id, action);
    if (updated === vault) return;
    setVault(updated);
    persist(updated);
  };

  const exportBackup = async () => {
    const meta = await storage.get("garph_meta");
    const v = await storage.get("garph_vault");
    if (!meta?.value || !v?.value) throw new Error("There is no saved vault to export.");
    const contents = JSON.stringify({ meta: JSON.parse(meta.value), vault: JSON.parse(v.value) }, null, 2);
    const filename = "garph-backup.json";

    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.writeFile({
        path: filename,
        data: contents,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: "Garph encrypted backup",
        text: "Save or share your encrypted Garph backup.",
        url: file.uri,
        dialogTitle: "Save encrypted backup",
      });
      return;
    }

    const blob = new Blob([contents], { type: "application/json" });
    const sharedFile = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare?.({ files: [sharedFile] })) {
      await navigator.share({ title: "Garph encrypted backup", files: [sharedFile] });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (file) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      await storage.set("garph_meta", JSON.stringify(parsed.meta));
      await storage.set("garph_vault", JSON.stringify(parsed.vault));
      window.location.reload();
    } catch {
      alert("Invalid backup file.");
    }
  };

  const deleteAll = async () => {
    try { await storage.delete("garph_meta"); } catch { /* ignore */ }
    try { await storage.delete("garph_vault"); } catch { /* ignore */ }
    setVault(null); setCryptoKey(null); setPhase("create");
  };

  const lockNow = () => { setCryptoKey(null); setPhase("unlock"); };

  // auto-lock on inactivity
  useEffect(() => {
    if (phase !== "app") return;
    const bump = () => { lastActivity.current = Date.now(); };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    const iv = setInterval(() => {
      const mins = vault?.settings?.autoLockMinutes ?? 5;
      if (mins > 0 && Date.now() - lastActivity.current > mins * 60000) lockNow();
    }, 15000);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      clearInterval(iv);
    };
  }, [phase, vault]);

  // periodic reprocessing while unlocked (catches day/week/month rollover live)
  useEffect(() => {
    if (phase !== "app" || !vault) return;
    const processed = processPeriods(vault, now);
    if (JSON.stringify(processed) !== JSON.stringify(vault)) {
      setVault(processed);
      persist(processed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  if (phase === "loading") return <SplashScreen onFinish={() => setPhase(nextPhase)} />;
  if (phase === "create") return <LoginScreen mode="create" theme={theme} onCreate={onCreate} error={error} />;
  if (phase === "unlock") return <LoginScreen mode="unlock" theme={theme} username={metaUsername} onUnlock={onUnlock} error={error} />;
  if (phase === "granting") return <LoginScreen mode="granting" theme={theme} />;
  if (!vault) return null;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontSize: `${(theme.fontScale || 1) * 14}px` }}>
      <NotificationCenter theme={theme} notifications={vault.notifications || []}
        onAccept={(id) => resolveNotification(id, "accept")}
        onDismiss={(id) => resolveNotification(id, "dismiss")}
        onRead={(id) => resolveNotification(id, "read")} />
      <div className="app-shell">
        <div className="sidebar no-print" style={{ display: "none", flexDirection: "column", gap: 4, padding: 20, borderRight: `1px solid ${theme.border}`, height: "100vh", position: "sticky", top: 0 }}>
          <div style={{ fontFamily: theme.mono, fontSize: 18, letterSpacing: 2, marginBottom: 24 }}>GARPH</div>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === n.id ? `${theme.accent}22` : "transparent", color: tab === n.id ? theme.accent : theme.text, fontFamily: theme.sans, fontSize: 14, textAlign: "left",
            }}><n.icon size={18} /> {n.label}</button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          {tab === "dashboard" && <Dashboard theme={theme} vault={vault} now={now} onSelectTab={setTab} />}
          {tab === "transactions" && <TransactionsView theme={theme} vault={vault} />}
          {tab === "budget" && <BudgetView theme={theme} vault={vault} now={now} onUpdate={update} />}
          {tab === "savings" && <SavingsView theme={theme} vault={vault} />}
          {tab === "analytics" && <AnalyticsView theme={theme} vault={vault} now={now} />}
          {tab === "settings" && (
            <SettingsView theme={theme} vault={vault} onUpdate={update}
              onChangePassword={onChangePassword} onExportBackup={exportBackup}
              onImportBackup={importBackup} onDeleteAll={deleteAll} onLockNow={lockNow} />
          )}

          <button className="no-print" onClick={() => setShowAdd(true)} style={{
            position: "fixed", right: 20, bottom: 84, width: 56, height: 56, borderRadius: "50%", border: "none",
            background: theme.accent, color: "#00131a", boxShadow: theme.glow, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20,
          }}><Plus size={26} /></button>
        </div>
      </div>

      <div className="bottomnav"><BottomNav theme={theme} tab={tab} setTab={setTab} /></div>
      {showAdd && <QuickAdd theme={theme} onClose={() => setShowAdd(false)} onSubmit={addTransaction} />}
      <PrintSummary vault={vault} now={now} />
    </div>
  );
}
