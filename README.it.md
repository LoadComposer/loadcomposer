<p align="center">
  <img src="site/assets/loadcomposer-desktop-day.svg" width="560" alt="LoadComposer — Compose the perfect load">
</p>

<p align="center"><strong>Compose the perfect load.</strong></p>

# LoadComposer

LoadComposer è un ausilio alla pianificazione nel browser che stima la disposizione geometrica dei pallet nei principali container marittimi e bilici da 13,60 m. Gestisce carichi a pallet singolo e misti, rotazione e orientamento obbligatorio dell’inforcamento, quantità su livelli, anteprime responsive, stampa operativa localizzata e una pagina standalone offline.

> **Candidata corrente:** `v1.5.0` (C4a), in attesa della verifica indipendente del delta e dell’approvazione manuale. Non ancora pubblicata. Verificare i risultati prima dell’uso operativo.

| Giorno | Notte |
|---|---|
| ![LoadComposer tema giorno](docs/screenshots/loadcomposer-day-desktop.png) | ![LoadComposer tema notte](docs/screenshots/loadcomposer-night-desktop.png) |

| Pallet misti desktop | Pallet misti mobile |
|---|---|
| ![Flusso pallet misti desktop](docs/screenshots/loadcomposer-mixed-desktop-de.png) | ![Flusso pallet misti mobile](docs/screenshots/loadcomposer-mixed-mobile.png) |

## Funzioni

- Carichi con un tipo di pallet su uno o più strati; misti solo a pavimento; Advanced Stacking con pile esplicite e vincoli di compatibilità per gruppo.
- Formati predefiniti, misure personalizzate e vincoli di orientamento.
- Container 20' Dry, 40' Dry, 40' HC, 45' HC, 20' Reefer, 40' HC Reefer, 40' e 45' HC Pallet Wide e 45' Reefer Pallet Wide.
- Bilici da 13,60 m telonato, mega e frigo.
- Vista laterale e dalla rampa, colore e bianco/nero, tema chiaro e scuro.
- Interfaccia e stampa in italiano, inglese, tedesco, spagnolo, francese, portoghese e olandese.
- Deploy web modulare con cataloghi locali e pagina HTML standalone autonoma per `file://`.
- Elaborazione locale nel browser senza backend applicativo, tracker, analytics, font esterni o dipendenze CDN a runtime.

## Avvio rapido

```bash
python3 -m http.server 8000 --directory site
```

Aprire `http://127.0.0.1:8000/`. Quando Internet è disponibile è consigliata
la versione online. La pagina seguente spiega le due modalità e offre gli
artefatti offline correnti:

```text
site/downloads/index.html
```

Per l’uso offline il download più semplice è l’HTML standalone:

```text
site/downloads/loadcomposer-v1.5.0-standalone.html
```

Copiarlo sul computer offline e aprirlo nel browser. Per archiviazione o
distribuzione interna è disponibile anche
`site/downloads/loadcomposer-v1.5.0-standalone.zip`.

Per ricostruire il prodotto dalla delivery:

```bash
node --version  # v22.17.0 oppure una versione compatibile >=24.0.0
npm ci
npm run build
```

La delivery include `package.json`, `package-lock.json` e il runtime di build.
Test automatici e fixture sono nel test bundle v1.5.0 separato: da quella
cartella eseguire `npm ci` e `npm test` per la suite completa. La generazione
delle immagini delle guide usa il launcher Chromium Linux incluso.

Usare Node.js conforme a `^22.17.0 || >=24.0.0` e npm 11.9.0; C3j/C4 hanno usato Node.js 24.22.1. Su Cloudflare Pages
non servono framework o comando di build: la directory di output è `site`.
Seguire [GITHUB_FIRST_PUSH.md](docs/GITHUB_FIRST_PUSH.md),
[DEPLOYMENT.md](docs/DEPLOYMENT.md) e
[CLOUDFLARE_PREVIEW_CHECKLIST.md](docs/CLOUDFLARE_PREVIEW_CHECKLIST.md).

## Limiti essenziali

LoadComposer produce stime geometriche mediante disposizioni euristiche. Non è un’analisi ingegneristica, un’istruzione di carico, una certificazione di sicurezza o un controllo normativo. Non determina conformità di peso, distribuzione, baricentro, assi, pavimento, stabilità, rizzaggio, imballaggio, accesso dei mezzi di movimentazione, merci pericolose o tolleranze reali. “NON OK” non dimostra che una disposizione sia impossibile; un esito positivo non dimostra sicurezza o legalità.

Confermare misure ed equipment e richiedere verifiche qualificate operative, ingegneristiche, di sicurezza, del vettore e legali. Leggere [LIMITATIONS.md](docs/LIMITATIONS.md) e [LICENSE](LICENSE).

## Licenza e progetto

LoadComposer è source-available con la licenza personalizzata [LoadComposer Community License 1.0](LICENSE), `LCCL-1.0`, espressa nei metadati come `LicenseRef-LoadComposer-Community-1.0`. Consente gli usi descritti, incluso il normale uso interno d’impresa, e riserva alla licenza commerciale gli sfruttamenti monetizzati definiti. Fa fede il testo inglese; [LICENSE.it.md](LICENSE.it.md) è una traduzione informativa.

- [Indice legale pubblico](site/legal/)
- [Licenza commerciale](COMMERCIAL-LICENSING.md)
- [Contributi](CONTRIBUTING.md) e [CLA](CLA.md)
- [Sicurezza](SECURITY.md)
- [Privacy](PRIVACY.md)
- [Marchi](TRADEMARKS.md)
- [Roadmap](ROADMAP.md)

Sito ufficiale: [loadcomposer.com](https://loadcomposer.com/)  
Repository ufficiale: [github.com/LoadComposer/loadcomposer](https://github.com/LoadComposer/loadcomposer)
Pagina Download: [loadcomposer.com/downloads/](https://loadcomposer.com/downloads/)

Copyright © 2026 Marco Pernigotti.

## Verifica e approvazione della candidata

Usare Node.js conforme a `^22.17.0 || >=24.0.0` e npm 11.9.0. C3j/C4 sono stati verificati con Node.js 24.22.1. Controllare `SHA256SUMS-C4a-v1.5.0.txt` e `PACKAGE_VERIFICATION-C4a-v1.5.0.json` forniti accanto agli archivi, quindi CRC e manifesti interni dopo l’estrazione. Il test bundle contiene la suite `npm test` completa, incluso `test:c4a`; la delivery contiene gli input di build senza le prove QA pesanti. Consultare [DEPLOYMENT.md](docs/DEPLOYMENT.md) per la verifica e l’eventuale pubblicazione futura.

S02 resta MINOR accettato nel perimetro della mutazione/ripristino controllati documentato da C4: la preview rampa può restare obsoleta fino al ridisegno, mentre il documento stampato è corretto. C4a non lo risolve. La candidata non autorizza deploy, pubblicazione, tag o GitHub Release.
