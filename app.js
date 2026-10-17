(function () {
  const cfg = window.SITE_CONFIG || {};

  // Kontakty
  const set = (key, text, href) => {
    const a = document.querySelector(`[data-contact="${key}"]`);
    if (a) { a.textContent = text; a.href = href; }
  };
  window.renderContacts = (c) => {
    set("phone", c.phone, "tel:" + (c.phone || "").replace(/\s/g, ""));
    set("email", c.email, "mailto:" + c.email);
    set("instagram", "@" + c.instagram, "https://instagram.com/" + c.instagram);
    document.querySelector('[data-contact-row="instagram"]').hidden = !c.instagram;
  };
  window.renderContacts(cfg);
  document.getElementById("year").textContent = new Date().getFullYear();

  // Administrácia: otvorí sa cez ?admin
  if (new URLSearchParams(location.search).has("admin")) {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "admin/admin.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "admin/admin.js"; js.defer = true;
    document.body.appendChild(js);
  }

  // Mobilné menu
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", (e) => { if (e.target.tagName === "A") links.classList.remove("open"); });

  // Rezervácie: Cal.com, ak je nastavený, inak náhradný formulár
  const tabs = document.querySelectorAll(".tabs [data-type]");
  const embedEl = document.getElementById("cal-embed");
  const form = document.getElementById("request-form");
  const useCal = Boolean(cfg.calUsername);
  let calReady = false;

  function loadCal() {
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    calReady = true;
  }

  function showType(type) {
    tabs.forEach((t) => t.setAttribute("aria-selected", t.dataset.type === type));
    if (useCal) {
      if (!calReady) loadCal();
      embedEl.innerHTML = "";
      const ns = "t_" + type;
      window.Cal("init", ns, { origin: "https://cal.com" });
      window.Cal.ns[ns]("inline", {
        elementOrSelector: "#cal-embed",
        calLink: `${cfg.calUsername}/${cfg.calEvents[type]}`,
        config: { layout: "month_view" },
      });
      window.Cal.ns[ns]("ui", { theme: "light", cssVarsPerTheme: { light: { "cal-brand": "#0b4f6c" } }, hideEventTypeDetails: false, layout: "month_view" });
    } else {
      form.elements.typ.value = type;
    }
  }

  if (useCal) embedEl.hidden = false; else form.hidden = false;
  tabs.forEach((t) => t.addEventListener("click", () => showType(t.dataset.type)));
  document.querySelectorAll("[data-book]").forEach((b) =>
    b.addEventListener("click", () => showType(b.dataset.book))
  );
  if (!useCal) form.elements.typ.addEventListener("change", (e) =>
    tabs.forEach((t) => t.setAttribute("aria-selected", t.dataset.type === e.target.value))
  );
  showType("deti");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = form.elements;
    const typText = f.typ.options[f.typ.selectedIndex].text;
    const body = [
      `Meno: ${f.meno.value}`, `Telefón: ${f.telefon.value}`, `E-mail: ${f.email.value}`,
      `Tréning: ${typText}`, `Preferovaný dátum: ${f.datum.value || "–"}`, `Preferovaný čas: ${f.cas.value}`,
      "", f.poznamka.value,
    ].join("\n");
    location.href = `mailto:${cfg.email}?subject=${encodeURIComponent("Žiadosť o tréning – " + typText)}&body=${encodeURIComponent(body)}`;
  });
})();
