/* Connects Tender Desk to Firebase (Google sign-in + Firestore).
   The app talks to window.claude.use("db" | "user" | "downloads"); this file provides those on a normal website. */
(() => {
  let resolveReady;
  const ready = new Promise(r => (resolveReady = r));
  const shims = {};
  window.claude = { use: name => ready.then(() => shims[name] ?? null) };

  const css = `
  #fb-gate{position:fixed;inset:0;z-index:100;background:var(--bg);display:grid;place-items:center;padding:24px}
  #fb-gate .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:28px 24px;max-width:440px;width:100%;text-align:center}
  #fb-gate h1{font-family:var(--display);font-size:30px;margin:0 0 6px}
  #fb-gate p{color:var(--muted);margin:0 0 16px}
  #fb-gate .btn{font-size:15px;padding:10px 18px}
  #fb-gate code{font-family:var(--mono);font-size:12.5px}
  details.acct{position:relative;margin-left:8px}
  details.acct summary{list-style:none}
  details.acct summary::-webkit-details-marker{display:none}
  .acct-menu{position:absolute;right:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);padding:10px;width:250px;display:flex;flex-direction:column;gap:6px;z-index:30}
  .acct-menu .btn{text-align:left;width:100%}
  .acct-menu .who{font-size:12.5px;color:var(--muted);word-break:break-all;padding:2px 4px 6px;border-bottom:1px solid var(--line)}
  .acct-menu .msg{font-size:12.5px;color:var(--muted);padding:0 4px}
  @media (max-width:720px){details.acct{margin-left:auto}}`;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function gate(html) {
    let g = document.getElementById("fb-gate");
    if (!g) { g = document.createElement("div"); g.id = "fb-gate"; document.body.appendChild(g); }
    g.hidden = false;
    g.innerHTML = `<div class="card"><h1>Tender Desk</h1>${html}</div>`;
    return g;
  }
  const hideGate = () => { const g = document.getElementById("fb-gate"); if (g) g.hidden = true; };

  function init() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) { gate(`<p>This site is not connected to its database yet.</p><p>Paste the Firebase config into <code>firebase-config.js</code> in the repository. The README has the steps.</p>`); return; }
    if (!window.firebase) { gate(`<p>The database library could not be loaded. Check your internet connection and reload the page.</p>`); return; }
    firebase.initializeApp(cfg);
    const auth = firebase.auth(), fs = firebase.firestore();
    let started = false;
    gate(`<p>Checking sign-in…</p>`);

    const signInGate = msg => {
      const g = gate(`<p>${msg || "Sign in with the Google account that has access to the tender register."}</p><button class="btn primary" id="fbIn">Sign in with Google</button><p id="fbErr" style="margin:12px 0 0"></p>`);
      g.querySelector("#fbIn").onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => {
        g.querySelector("#fbErr").textContent = e && e.code === "auth/unauthorized-domain"
          ? "This web address is not yet allowed to sign in. Add it under Authentication > Settings > Authorized domains in the Firebase console."
          : e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") ? "" : "Sign-in did not complete: " + (e && e.message || e);
      });
    };
    const deniedGate = () => {
      const u = auth.currentUser;
      const g = gate(`<p><b>${esc(u && u.email)}</b> does not have access to this register. Ask the owner to add this address to the Firestore rules, then reload.</p><button class="btn" id="fbOut">Use a different account</button>`);
      g.querySelector("#fbOut").onclick = () => auth.signOut().then(() => location.reload());
    };
    const fail = e => {
      if (e && e.code === "permission-denied") { deniedGate(); throw { code: "revoked", message: "No access" }; }
      throw { code: (e && e.code) || "unavailable", message: (e && e.message) || String(e) };
    };
    const clean = d => JSON.parse(JSON.stringify(d));

    auth.onAuthStateChanged(u => {
      if (!u) { if (started) location.reload(); else signInGate(); return; }
      if (started) return;
      started = true; hideGate();

      const wrapDoc = r => ({
        id: r.id, path: r.path,
        get: () => r.get().catch(fail),
        set: d => r.set(clean(d)).catch(fail),
        update: d => r.set(clean(d), { merge: true }).catch(fail),   // deep-merges nested fields
        delete: () => r.delete().catch(fail),
      });
      const wrapQuery = q => ({
        limit: n => wrapQuery(q.limit(n)),
        get: () => q.get().catch(fail),
        onSnapshot: (next, err) => q.onSnapshot(next, e => { if (e && e.code === "permission-denied") deniedGate(); else if (err) err({ code: e.code || "unavailable", message: e.message }); }),
      });
      shims.db = { collection: name => { const c = fs.collection(name); return Object.assign(wrapQuery(c), { doc: id => wrapDoc(id ? c.doc(id) : c.doc()) }); }, doc: p => wrapDoc(fs.doc(p)) };

      const names = {};
      shims.user = {
        id: async () => u.uid, isOwner: async () => false, canEdit: async () => false, can: async () => null,
        profiles: async ids => {
          await Promise.all(ids.filter(i => !(i in names)).map(i => fs.collection("users").doc(i).get().then(s => { names[i] = (s.exists && s.data().name) || ""; }).catch(() => { names[i] = ""; })));
          return Object.fromEntries(ids.map(i => [i, { name: names[i] || "" }]));
        },
      };
      const saveFile = (filename, data) => { const a = document.createElement("a"); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
      shims.downloads = { save: async ({ filename, data }) => saveFile(filename, data) };

      fs.collection("users").doc(u.uid).set({ name: u.displayName || (u.email || "").split("@")[0] }, { merge: true }).catch(() => {});

      // Account menu: backup, import, sign out
      const d = document.createElement("details"); d.className = "acct";
      d.innerHTML = `<summary class="btn" aria-label="Account and data">Account</summary><div class="acct-menu"><div class="who">${esc(u.email)}</div><button class="btn" id="fbBackup">Download backup (JSON)</button><label class="btn" style="cursor:pointer">Import backup…<input type="file" id="fbImport" accept=".json,application/json" hidden></label><div class="msg" id="fbMsg"></div><button class="btn" id="fbSignOut">Sign out</button></div>`;
      (document.querySelector(".bar .wrap") || document.body).appendChild(d);
      const msg = t => (d.querySelector("#fbMsg").textContent = t);
      d.querySelector("#fbSignOut").onclick = () => auth.signOut();
      d.querySelector("#fbBackup").onclick = async () => {
        try { const s = await fs.collection("tenders").get(); const out = {}; s.docs.forEach(x => (out[x.id] = x.data()));
          saveFile("tender-desk-backup-" + new Date().toISOString().slice(0, 10) + ".json", new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), tenders: out })], { type: "application/json" }));
          msg(s.size + " tenders saved to the backup file."); } catch (e) { msg("Backup failed: " + (e.message || e.code)); }
      };
      d.querySelector("#fbImport").onchange = async ev => {
        const f = ev.target.files[0]; ev.target.value = ""; if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          const src = j.tenders || j;
          const rows = Array.isArray(src) ? src.map((x, i) => [x.id || "i" + i, x]) : Object.entries(src);
          if (!rows.length) { msg("That file has no tenders in it."); return; }
          if (!confirm(`Import ${rows.length} tenders? Tenders already here with the same ID are replaced.`)) return;
          for (let i = 0; i < rows.length; i += 400) {
            const b = fs.batch();
            rows.slice(i, i + 400).forEach(([id, data]) => { const c = clean(data); delete c.id; b.set(fs.collection("tenders").doc(String(id)), c); });
            await b.commit(); msg(`Imported ${Math.min(i + 400, rows.length)} of ${rows.length}…`);
          }
          msg(`Imported ${rows.length} tenders.`);
        } catch (e) { msg(e && e.code === "permission-denied" ? "This account is not allowed to write to the register." : "Import failed: " + (e.message || e)); }
      };
      document.addEventListener("click", e => { if (d.open && !d.contains(e.target)) d.open = false; });

      resolveReady();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
