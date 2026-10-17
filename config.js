// Nastavenia webu – tu sa menia kontakty a rezervačný systém.
// Všetko označené ako ZÁSTUPNÉ treba pred ostrou prevádzkou nahradiť.
window.SITE_CONFIG = {
  // Kontakty (ZÁSTUPNÉ)
  phone: "+421 900 000 000",
  email: "valentina.plavanie@example.com",
  instagram: "", // napr. "valentina.plavanie" – prázdne = skryté

  // Cal.com rezervácie.
  // 1) Valentína si založí účet na https://cal.com (zdarma) a prepojí Google kalendár.
  // 2) Vytvorí tri typy udalostí so slugmi nižšie (alebo slugy tu prepíše).
  // 3) Sem doplní svoje používateľské meno z Cal.com.
  // Kým je calUsername prázdne, web zobrazí náhradný formulár so žiadosťou o termín.
  calUsername: "",
  calEvents: {
    deti: "trening-deti",
    dospeli: "trening-dospeli",
    otuzovanie: "priprava-otuzovanie",
  },
};
