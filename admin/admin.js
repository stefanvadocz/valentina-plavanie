// Administrácia webu: úpravy priamo na stránke (WYSIWYG), ukladanie commitom do GitHub repozitára.
(function () {
  const cfg = window.SITE_CONFIG;
  const gh = cfg.github;
  const API = `${gh.apiBase || "https://api.github.com"}/repos/${gh.owner}/${gh.repo}`;
  const RAW = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${gh.branch}/`;
  const TOKEN_KEY = "vv_admin_token";
  const IMG_SEL = "[data-edit-img], [data-edit-gallery] img";
  const MULTILINE = new Set(["P", "FIGCAPTION"]);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  let token = storage("get");
  let settings = JSON.parse(JSON.stringify(cfg));
  let settingsDirty = false;
  let dirty = false;
  let busy = false;

  function storage(op, val) {
    try {
      if (op === "get") return localStorage.getItem(TOKEN_KEY) || "";
      if (op === "set") localStorage.setItem(TOKEN_KEY, val);
      if (op === "del") localStorage.removeItem(TOKEN_KEY);
    } catch (e) { return ""; }
  }

  // ---------- GitHub API ----------
  async function api(path, { method = "GET", body, raw } = {}) {
    const res = await fetch(API + path, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = `${res.status}`;
      try { msg += " " + (await res.json()).message; } catch (e) {}
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return raw ? res.text() : res.json();
  }

  async function headCommit() {
    const ref = await api(`/git/ref/heads/${gh.branch}`);
    return ref.object.sha;
  }

  // ---------- UI ----------
  const bar = h(`
    <div class="adm-ui adm-bar">
      <strong class="adm-title">✎ Úprava webu</strong>
      <span class="adm-status">Načítavam…</span>
      <span class="adm-actions">
        <button type="button" data-act="settings">Nastavenia</button>
        <button type="button" data-act="discard">Zahodiť zmeny</button>
        <button type="button" data-act="save" class="adm-primary">Uložiť a zverejniť</button>
        <button type="button" data-act="logout">Odhlásiť</button>
      </span>
    </div>`);
  const hint = h(`<div class="adm-ui adm-hint">Kliknite do ľubovoľného textu a píšte. Fotku zmeníte kliknutím na ňu. Text označte myšou pre tučné písmo alebo odkaz.</div>`);
  const fmt = h(`
    <div class="adm-ui adm-fmt" hidden>
      <button type="button" data-cmd="bold" title="Tučné"><b>B</b></button>
      <button type="button" data-cmd="italic" title="Kurzíva"><i>I</i></button>
      <button type="button" data-cmd="link" title="Vložiť odkaz">🔗</button>
      <button type="button" data-cmd="unlink" title="Zrušiť odkaz">⛓︎̸</button>
      <button type="button" data-cmd="removeFormat" title="Zrušiť formátovanie">T̸</button>
    </div>`);
  const imgBtn = h(`<button type="button" class="adm-ui adm-imgbtn" hidden>📷 Zmeniť fotku</button>`);
  const filePick = h(`<input type="file" accept="image/*" class="adm-ui" hidden>`);

  function setStatus(text, kind = "") {
    const el = $(".adm-status", bar);
    el.textContent = text;
    el.dataset.kind = kind;
  }
  function markDirty() {
    if (!dirty) { dirty = true; setStatus("● Neuložené zmeny", "dirty"); }
  }

  function modal(html) {
    const m = h(`<div class="adm-ui adm-modal"><div class="adm-dialog">${html}</div></div>`);
    document.body.appendChild(m);
    return m;
  }

  // ---------- Prihlásenie ----------
  function showLogin(error) {
    const m = modal(`
      <h2>Administrácia webu</h2>
      <p>Na ukladanie zmien potrebujete prístupový kľúč (token) z GitHubu. Stačí ho vytvoriť raz, prehliadač si ho zapamätá.</p>
      <ol>
        <li>Otvorte <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">vytvorenie tokenu na GitHube</a>.</li>
        <li><b>Token name:</b> napr. „Web Valentína“, <b>Expiration:</b> podľa potreby (napr. 1 rok).</li>
        <li><b>Repository access:</b> Only select repositories → <code>${gh.repo}</code>.</li>
        <li><b>Permissions → Repository → Contents:</b> Read and write.</li>
        <li>Kliknite <b>Generate token</b> a skopírujte ho sem.</li>
      </ol>
      <form class="adm-login">
        <input type="password" name="token" placeholder="github_pat_…" autocomplete="off" required>
        <button class="adm-primary" type="submit">Prihlásiť</button>
      </form>
      <p class="adm-error">${error || ""}</p>
      <p class="adm-small"><a href="./">← Späť na web bez úprav</a></p>`);
    $("form", m).addEventListener("submit", async (e) => {
      e.preventDefault();
      token = e.target.token.value.trim();
      $(".adm-error", m).textContent = "Overujem…";
      try {
        await api("");
        storage("set", token);
        m.remove();
        start();
      } catch (err) {
        $(".adm-error", m).textContent = err.status === 401 || err.status === 404
          ? "Token nefunguje alebo nemá prístup k repozitáru. Skontrolujte kroky vyššie."
          : "Chyba spojenia: " + err.message;
      }
    });
  }

  // ---------- Načítanie aktuálneho obsahu z GitHubu ----------
  // GitHub Pages sa po uložení aktualizuje s oneskorením, preto obsah na úpravu berieme priamo z repozitára.
  async function syncFromRepo() {
    const sha = await headCommit();
    const [html, configJs] = await Promise.all([
      api(`/contents/index.html?ref=${sha}`, { raw: true }),
      api(`/contents/config.js?ref=${sha}`, { raw: true }),
    ]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    $$("[data-edit]", doc).forEach((src) => {
      const live = $(`[data-edit="${src.dataset.edit}"]`);
      if (live) live.innerHTML = src.innerHTML;
    });
    $$("[data-edit-img]", doc).forEach((src) => {
      const live = $(`[data-edit-img="${src.dataset.editImg}"]`);
      if (live) live.setAttribute("src", src.getAttribute("src"));
    });
    $$("[data-edit-gallery], [data-edit-table]", doc).forEach((src) => {
      const sel = src.dataset.editGallery ? `[data-edit-gallery="${src.dataset.editGallery}"]` : `[data-edit-table="${src.dataset.editTable}"]`;
      const live = $(sel);
      if (live) live.innerHTML = src.innerHTML;
    });
    try {
      settings = JSON.parse(configJs.slice(configJs.indexOf("{"), configJs.lastIndexOf("}") + 1));
      window.renderContacts(settings);
    } catch (e) { /* ponecháme načítaný config */ }
  }

  // Obrázky, ktoré už sú v repozitári, ale GitHub Pages ich ešte nezverejnil
  function rawFallback(img) {
    img.addEventListener("error", () => {
      const src = img.getAttribute("src");
      if (src && !/^(data:|https?:)/.test(src)) img.src = RAW + src;
    }, { once: true });
  }

  // ---------- Zapnutie úprav ----------
  function enableEditing() {
    document.body.classList.add("adm-on");
    $$("[data-edit]").forEach((el) => { el.contentEditable = "true"; el.spellcheck = true; });
    $$("details").forEach((d) => (d.open = true));
    $$(IMG_SEL).forEach(rawFallback);
    setupGallery();
    setupTable();
  }

  function setupGallery() {
    $$("[data-edit-gallery]").forEach((g) => {
      $$("figure", g).forEach(decorateFigure);
      const add = h(`<button type="button" class="adm-ui adm-add">＋ Pridať fotky</button>`);
      add.addEventListener("click", () => pickFiles(true, async (files) => {
        for (const f of files) {
          const url = await processImage(f, 1600);
          if (!url) continue;
          const fig = h(`<figure><img src="${url}" alt=""><figcaption></figcaption></figure>`);
          g.insertBefore(fig, add);
          decorateFigure(fig);
        }
        markDirty();
      }));
      g.appendChild(add);
    });
  }

  function decorateFigure(fig) {
    let cap = $("figcaption", fig);
    if (!cap) { cap = document.createElement("figcaption"); fig.appendChild(cap); }
    cap.contentEditable = "true";
    cap.dataset.placeholder = "Popis fotky (nepovinné)";
    const ctl = h(`<div class="adm-ui adm-fig-ctl">
      <button type="button" data-g="prev" title="Posunúť doľava">◀</button>
      <button type="button" data-g="next" title="Posunúť doprava">▶</button>
      <button type="button" data-g="del" title="Odstrániť fotku">✕</button></div>`);
    ctl.addEventListener("click", (e) => {
      const act = e.target.closest("button")?.dataset.g;
      if (!act) return;
      if (act === "del" && confirm("Odstrániť túto fotku z galérie?")) fig.remove();
      if (act === "prev" && fig.previousElementSibling) fig.parentNode.insertBefore(fig, fig.previousElementSibling);
      if (act === "next" && fig.nextElementSibling?.tagName === "FIGURE") fig.parentNode.insertBefore(fig.nextElementSibling, fig);
      markDirty();
    });
    fig.appendChild(ctl);
  }

  function setupTable() {
    $$("[data-edit-table]").forEach((tb) => {
      const table = tb.closest("table");
      table.querySelector("thead tr").appendChild(h(`<th class="adm-ui"></th>`));
      $$("tr", tb).forEach(decorateRow);
      const add = h(`<button type="button" class="adm-ui adm-add-row">＋ Pridať výsledok</button>`);
      add.addEventListener("click", () => {
        const d = new Date();
        const date = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
        const tr = h(`<table><tr><td>${date}</td><td>Miesto</td><td>Disciplína</td><td>0:00,00</td><td>🥇 1. miesto</td></tr></table>`).querySelector("tr");
        tb.insertBefore(tr, tb.firstChild);
        decorateRow(tr);
        tr.cells[1].focus();
        markDirty();
      });
      table.closest(".table-wrap").before(add);
    });
  }

  function decorateRow(tr) {
    [...tr.cells].forEach((td) => (td.contentEditable = "true"));
    const del = h(`<table><tr><td class="adm-ui"><button type="button" title="Odstrániť riadok">✕</button></td></tr></table>`).querySelector("td");
    del.querySelector("button").addEventListener("click", () => {
      if (confirm("Odstrániť tento výsledok?")) { tr.remove(); markDirty(); }
    });
    tr.appendChild(del);
  }

  // ---------- Obrázky ----------
  function pickFiles(multiple, cb) {
    filePick.multiple = multiple;
    filePick.value = "";
    filePick.onchange = () => cb([...filePick.files]);
    filePick.click();
  }

  // Zmenší fotku a prevedie ju na JPEG, aby web zostal rýchly
  function processImage(file, maxSize) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        alert(`Súbor „${file.name}“ sa nedá načítať. Použite fotku vo formáte JPG alebo PNG (fotky z iPhonu vo formáte HEIC najprv exportujte ako JPG).`);
        resolve(null);
      };
      img.src = url;
    });
  }

  let currentImg = null;
  document.addEventListener("mouseover", (e) => {
    if (!document.body.classList.contains("adm-on")) return;
    const img = e.target.closest(IMG_SEL);
    if (!img || img === currentImg) return;
    currentImg = img;
    const r = img.getBoundingClientRect();
    imgBtn.style.top = `${r.top + window.scrollY + 12}px`;
    imgBtn.style.left = `${r.left + window.scrollX + 12}px`;
    imgBtn.hidden = false;
  });
  function changeImage(img) {
    pickFiles(false, async ([f]) => {
      if (!f) return;
      const url = await processImage(f, img.matches("[data-edit-img]") ? 1400 : 1600);
      if (url) { img.src = url; markDirty(); }
    });
  }
  imgBtn.addEventListener("click", () => currentImg && changeImage(currentImg));

  // ---------- Písanie a formátovanie ----------
  const editableOf = (node) => node && (node.nodeType === 1 ? node : node.parentElement)?.closest('[contenteditable="true"]');

  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("adm-on")) return;
    if (e.target.closest(".adm-ui")) return;
    const img = e.target.closest(IMG_SEL);
    if (img) { e.preventDefault(); changeImage(img); return; }
    // v režime úprav odkazy a rozbaľovacie otázky nereagujú, aby sa dalo písať
    if (e.target.closest("[contenteditable] a, a[contenteditable], summary")) e.preventDefault();
  }, true);

  document.addEventListener("keydown", (e) => {
    const el = editableOf(e.target);
    if (!el) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (MULTILINE.has(el.tagName)) document.execCommand("insertLineBreak");
    } else if (e.key === " " && el.tagName === "SUMMARY") {
      e.preventDefault();
      document.execCommand("insertText", false, " ");
    }
  });

  document.addEventListener("paste", (e) => {
    const el = editableOf(e.target);
    if (!el) return;
    e.preventDefault();
    const text = (e.clipboardData.getData("text/plain") || "").replace(/\s*\n\s*/g, " ");
    document.execCommand("insertText", false, text);
  });

  document.addEventListener("input", (e) => { if (editableOf(e.target)) markDirty(); });

  document.addEventListener("selectionchange", () => {
    const sel = document.getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !editableOf(sel.anchorNode)) { fmt.hidden = true; return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    fmt.hidden = false;
    fmt.style.top = `${r.top + window.scrollY - fmt.offsetHeight - 8}px`;
    fmt.style.left = `${Math.max(8, r.left + window.scrollX + r.width / 2 - fmt.offsetWidth / 2)}px`;
  });
  fmt.addEventListener("mousedown", (e) => e.preventDefault());
  fmt.addEventListener("click", (e) => {
    const cmd = e.target.closest("button")?.dataset.cmd;
    if (!cmd) return;
    if (cmd === "link") {
      const url = prompt("Adresa odkazu (napr. https://…):", "https://");
      if (url && url !== "https://") document.execCommand("createLink", false, url);
    } else {
      document.execCommand(cmd);
    }
    markDirty();
  });

  // ---------- Nastavenia ----------
  function showSettings() {
    const s = settings;
    const m = modal(`
      <h2>Nastavenia</h2>
      <form class="adm-settings">
        <label>Telefón<input name="phone" value="${esc(s.phone)}"></label>
        <label>E-mail<input name="email" type="email" value="${esc(s.email)}"></label>
        <label>Instagram (bez @, prázdne = skryté)<input name="instagram" value="${esc(s.instagram)}"></label>
        <fieldset>
          <legend>Rezervácie Cal.com</legend>
          <label>Používateľské meno na Cal.com (prázdne = náhradný formulár)<input name="calUsername" value="${esc(s.calUsername)}"></label>
          <label>Udalosť – deti<input name="ev_deti" value="${esc(s.calEvents.deti)}"></label>
          <label>Udalosť – dospelí<input name="ev_dospeli" value="${esc(s.calEvents.dospeli)}"></label>
          <label>Udalosť – otužovanie<input name="ev_otuzovanie" value="${esc(s.calEvents.otuzovanie)}"></label>
        </fieldset>
        <div class="adm-row">
          <button type="button" data-close>Zrušiť</button>
          <button type="submit" class="adm-primary">Použiť</button>
        </div>
        <p class="adm-small">Zmeny sa zverejnia po kliknutí na „Uložiť a zverejniť“.</p>
      </form>`);
    $("[data-close]", m).addEventListener("click", () => m.remove());
    $("form", m).addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target.elements;
      settings = {
        ...settings,
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
        instagram: f.instagram.value.trim().replace(/^@/, ""),
        calUsername: f.calUsername.value.trim(),
        calEvents: { deti: f.ev_deti.value.trim(), dospeli: f.ev_dospeli.value.trim(), otuzovanie: f.ev_otuzovanie.value.trim() },
      };
      settingsDirty = true;
      window.renderContacts(settings);
      markDirty();
      m.remove();
    });
  }
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  function buildConfig(s) {
    return `// Nastavenia webu. Tento súbor prepisuje administrácia (?admin -> Nastavenia).
// calUsername: meno z Cal.com; kým je prázdne, web ukazuje náhradný formulár.
// github: repozitár, do ktorého administrácia ukladá zmeny.
window.SITE_CONFIG = ${JSON.stringify(s, null, 2)};
`;
  }

  // ---------- Uloženie ----------
  function cleanInner(live, newPaths) {
    const c = live.cloneNode(true);
    $$(".adm-ui", c).forEach((n) => n.remove());
    [c, ...$$("*", c)].forEach((n) => {
      n.removeAttribute("contenteditable");
      n.removeAttribute("spellcheck");
      n.removeAttribute("data-placeholder");
    });
    $$("img", c).forEach((img, i) => fixSrc(img, newPaths.get($$("img", live)[i])));
    return c.innerHTML;
  }
  function fixSrc(img, newPath) {
    let src = newPath || img.getAttribute("src") || "";
    if (src.startsWith(RAW)) src = src.slice(RAW.length);
    img.setAttribute("src", src);
  }

  async function save() {
    if (busy) return;
    if (!dirty) { setStatus("Žiadne zmeny na uloženie"); return; }
    busy = true;
    bar.classList.add("adm-busy");
    try {
      setStatus("Ukladám…");
      const base = await headCommit();
      const baseTree = (await api(`/git/commits/${base}`)).tree.sha;
      const html = await api(`/contents/index.html?ref=${base}`, { raw: true });
      const doc = new DOMParser().parseFromString(html, "text/html");
      const files = [];

      // 1) nové fotky
      const newImgs = $$(IMG_SEL).filter((i) => i.src.startsWith("data:"));
      const newPaths = new Map();
      const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
      for (const [n, img] of newImgs.entries()) {
        setStatus(`Nahrávam fotky (${n + 1}/${newImgs.length})…`);
        const blob = await api("/git/blobs", { method: "POST", body: { content: img.src.split(",")[1], encoding: "base64" } });
        const path = `images/${stamp}-${n + 1}.jpg`;
        files.push({ path, sha: blob.sha });
        newPaths.set(img, path);
      }

      // 2) texty, fotky, galéria a tabuľka do index.html
      setStatus("Ukladám texty…");
      $$("[data-edit]", doc).forEach((el) => {
        const live = $(`[data-edit="${el.dataset.edit}"]`);
        if (live) el.innerHTML = cleanInner(live, newPaths);
      });
      $$("[data-edit-img]", doc).forEach((el) => {
        const live = $(`[data-edit-img="${el.dataset.editImg}"]`);
        if (!live) return;
        el.setAttribute("src", live.getAttribute("src"));
        fixSrc(el, newPaths.get(live));
      });
      $$("[data-edit-gallery]", doc).forEach((el) => {
        const live = $(`[data-edit-gallery="${el.dataset.editGallery}"]`);
        if (live) el.innerHTML = "\n" + cleanInner(live, newPaths).trim() + "\n        ";
      });
      $$("[data-edit-table]", doc).forEach((el) => {
        const live = $(`[data-edit-table="${el.dataset.editTable}"]`);
        if (live) el.innerHTML = cleanInner(live, newPaths);
      });
      files.push({ path: "index.html", content: "<!doctype html>\n" + doc.documentElement.outerHTML + "\n" });
      if (settingsDirty) files.push({ path: "config.js", content: buildConfig(settings) });

      // 3) jeden commit so všetkými zmenami
      const tree = await api("/git/trees", {
        method: "POST",
        body: {
          base_tree: baseTree,
          tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", ...(f.sha ? { sha: f.sha } : { content: f.content }) })),
        },
      });
      const commit = await api("/git/commits", {
        method: "POST",
        body: { message: "Úprava obsahu cez administráciu", tree: tree.sha, parents: [base] },
      });
      await api(`/git/refs/heads/${gh.branch}`, { method: "PATCH", body: { sha: commit.sha } });

      // nové fotky ďalej zobrazujeme z repozitára, kým ich nezverejní GitHub Pages
      newPaths.forEach((path, img) => (img.src = RAW + path));
      dirty = false;
      settingsDirty = false;
      setStatus("✓ Uložené. Na webe sa zmeny objavia o 1–2 minúty.", "ok");
    } catch (err) {
      console.error(err);
      if (err.status === 401) { storage("del"); showLogin("Prihlásenie vypršalo, zadajte token znova. Vaše úpravy na stránke zostali."); }
      setStatus(
        err.status === 422 || err.status === 409
          ? "Medzitým niekto web upravil. Obnovte stránku a urobte zmenu znova."
          : "Uloženie zlyhalo: " + err.message,
        "error"
      );
    } finally {
      busy = false;
      bar.classList.remove("adm-busy");
    }
  }

  bar.addEventListener("click", (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (act === "save") save();
    if (act === "settings") showSettings();
    if (act === "discard" && (!dirty || confirm("Zahodiť všetky neuložené zmeny?"))) { dirty = false; location.reload(); }
    if (act === "logout" && (!dirty || confirm("Máte neuložené zmeny. Naozaj sa odhlásiť?"))) {
      storage("del"); dirty = false; location.href = "./";
    }
  });

  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- Štart ----------
  async function start() {
    document.body.append(bar, hint, fmt, imgBtn, filePick);
    try {
      await syncFromRepo();
      enableEditing();
      setStatus("Pripravené na úpravy");
    } catch (err) {
      console.error(err);
      if (err.status === 401) { bar.remove(); hint.remove(); storage("del"); showLogin("Token je neplatný alebo vypršal."); return; }
      setStatus("Nepodarilo sa načítať obsah: " + err.message, "error");
    }
  }

  if (token) start(); else showLogin();
})();
