(function () {
  const cfg = window.SITE_CONFIG || {};

  // Výsledky zo Slovenského pohára v zimnom plávaní (pohar.sportoveotuzovanie.sk)
  const RESULTS = [
    ["10.11.2024", "Mestská plaváreň Žilina", "50 m voľný spôsob, bazén", "0:47,50", 1],
    ["10.11.2024", "Mestská plaváreň Žilina", "500 m voľný spôsob, bazén", "12:55,32", 2],
    ["13.04.2024", "Rybníky Opatovce – Trenčín", "500 m voľný spôsob", "12:01,00", 1],
    ["13.04.2024", "Rybníky Opatovce – Trenčín", "50 m prsia", "0:48,12", 1],
    ["02.03.2024", "Senecké jazerá", "100 m prsia", "2:08,50", 1],
    ["02.03.2024", "Senecké jazerá", "500 m voľný spôsob", "10:47,60", 1],
    ["27.01.2024", "Zlaté Piesky, Bratislava", "250 m voľný spôsob", "5:24,66", 1],
    ["27.01.2024", "Zlaté Piesky, Bratislava", "50 m prsia", "0:54,44", 1],
    ["02.12.2023", "Domaša – Dobrá", "100 m prsia", "2:13,86", 1],
    ["02.12.2023", "Domaša – Dobrá", "500 m voľný spôsob", "11:10,34", 1],
    ["18.11.2023", "Oravská priehrada", "50 m prsia", "0:55,37", 1],
    ["18.11.2023", "Oravská priehrada", "500 m voľný spôsob", "11:27,30", 1],
    ["04.11.2023", "Mestská plaváreň Žilina", "50 m prsia, bazén", "0:53,52", 1],
    ["04.11.2023", "Mestská plaváreň Žilina", "500 m voľný spôsob, bazén", "11:28,51", 1],
    ["01.04.2023", "Domaša – Dobrá", "50 m prsia", "0:59,93", 1],
    ["01.04.2023", "Domaša – Dobrá", "250 m voľný spôsob", "5:27,70", 1],
    ["25.03.2023", "Rybníky Opatovce – Trenčín", "50 m prsia", "0:57,81", 1],
    ["25.03.2023", "Rybníky Opatovce – Trenčín", "250 m voľný spôsob", "5:40,51", 1],
    ["04.03.2023", "Thermalpark Dunajská Streda", "100 m prsia", "2:35,01", 2],
    ["04.03.2023", "Thermalpark Dunajská Streda", "50 m prsia", "1:06,67", 1],
    ["18.02.2023", "Nové Košariská, Dunajská Lužná", "50 m prsia", "1:04,61", 1],
    ["18.02.2023", "Nové Košariská, Dunajská Lužná", "100 m prsia", "2:17,05", 2],
    ["26.11.2022", "Lake Side Čierna Voda", "100 m prsia", "2:04,50", 2],
    ["26.11.2022", "Lake Side Čierna Voda", "50 m prsia", "1:03,50", 3],
  ];
  const MEDAL = { 1: ["🥇", "1. miesto"], 2: ["🥈", "2. miesto"], 3: ["🥉", "3. miesto"] };

  const tbody = document.getElementById("results-body");
  tbody.innerHTML = RESULTS.map(([d, place, disc, time, pos]) =>
    `<tr><td>${d}</td><td>${place}</td><td>${disc}</td><td>${time}</td>` +
    `<td><span class="pos pos-${pos}">${MEDAL[pos][0]} ${MEDAL[pos][1]}</span></td></tr>`
  ).join("");

  // Kontakty
  const set = (key, text, href) => {
    const a = document.querySelector(`[data-contact="${key}"]`);
    if (a) { a.textContent = text; a.href = href; }
  };
  set("phone", cfg.phone, "tel:" + (cfg.phone || "").replace(/\s/g, ""));
  set("email", cfg.email, "mailto:" + cfg.email);
  if (cfg.instagram) set("instagram", "@" + cfg.instagram, "https://instagram.com/" + cfg.instagram);
  else document.querySelector('[data-contact-row="instagram"]').remove();
  document.getElementById("year").textContent = new Date().getFullYear();

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
