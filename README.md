# Valentína Vadoczová – tréningy plávania

Statický web (HTML/CSS/JS) pre individuálne tréningy plávania v x-bionic® sphere Šamorín. Hosting: GitHub Pages.

## Úpravy
- Kontakty a rezervácie: `config.js`
- Ceny a texty: `index.html`
- Výsledky súťaží: pole `RESULTS` v `app.js`

## Zapnutie Cal.com rezervácií
1. Založiť účet na https://cal.com (zdarma), prepojiť Google kalendár.
2. Vytvoriť typy udalostí `trening-deti` (45 min), `trening-dospeli` (60 min), `priprava-otuzovanie` (60 min), nastaviť dostupnosť a miesto „x-bionic sphere Šamorín“.
3. Do `config.js` doplniť `calUsername`. Kým je prázdne, web zobrazuje náhradný formulár (otvorí e-mail).
