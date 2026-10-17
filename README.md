# Valentína Vadoczová – tréningy plávania

Statický web (HTML/CSS/JS) pre individuálne tréningy plávania v x-bionic® sphere Šamorín. Hosting: GitHub Pages.

## Administrácia (úpravy textov a fotiek)
Otvorte `https://stefanvadocz.github.io/valentina-plavanie/admin/` (alebo pridajte `?admin` za adresu webu).

- Texty sa upravujú priamo na stránke, stačí do nich kliknúť. Označený text sa dá zvýrazniť tučným písmom alebo z neho spraviť odkaz.
- Fotku zmeníte kliknutím na ňu. Do galérie sa fotky pridávajú, odstraňujú a presúvajú. Fotky sa pri nahrávaní automaticky zmenšia.
- Výsledky súťaží: riadky tabuľky sa dajú pridať, upraviť aj zmazať.
- **Nastavenia**: telefón, e-mail, Instagram a Cal.com.
- **Uložiť a zverejniť** vytvorí jeden commit v tomto repozitári. GitHub Pages ho zverejní o 1–2 minúty.

Prihlásenie: GitHub fine-grained token (Repository access: iba tento repozitár, Permissions → Contents: Read and write). Token zostáva uložený len v prehliadači, v ktorom ste sa prihlásili.

Technicky: editovateľné prvky majú v `index.html` atribút `data-edit`, `data-edit-img`, `data-edit-gallery` alebo `data-edit-table`. Nový editovateľný text pridáte tak, že mu dáte unikátny `data-edit="..."`.

## Zapnutie Cal.com rezervácií
1. Založiť účet na https://cal.com (zdarma), prepojiť Google kalendár.
2. Vytvoriť typy udalostí `trening-deti` (45 min), `trening-dospeli` (60 min), `priprava-otuzovanie` (60 min), nastaviť dostupnosť a miesto „x-bionic sphere Šamorín“.
3. Do `config.js` doplniť `calUsername`. Kým je prázdne, web zobrazuje náhradný formulár (otvorí e-mail).
