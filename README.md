
Timeline
========


A simple timeline app base on [timeline-api](https://github.com/gcc3/timeline-api).  


Setup
-----

Run `./setup.sh`. It creates local copies from the `.example` files and generates `langs.js`:

- `config.js` — timeline bands and initial date.  
- `data/<lang>.js` (e.g. `data/en.js`, `data/ja.js`, `data/zh.js`) — events and page title, one file per language.  
- `langs.js` — generated list of available languages, scanned from the `data/` folder.  

Then open `index.html` in a browser.  


Languages
---------

The dropdown at the top right switches the language; it is generated from `langs.js`.  
The choice is stored in localStorage (`locale`); the matching `data/<lang>.js` is loaded on reload (default: `en`).  
To add a language, create `data/<lang>.js` and run `./setup.sh` again — it rescans the `data/` folder, no list to edit by hand.  
