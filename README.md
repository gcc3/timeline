
Timeline
========


A simple timeline app base on [timeline-api](https://github.com/gcc3/timeline-api).  


Setup
-----

Run `./setup.sh`. It creates local copies from the `.example` files and generates `langs.js`:

- `config.js` — timeline bands and initial date.  
- `data.js` / `data.ja.js` / `data.zh.js` — events and page title, one file per language (`data.js` is English).  
- `langs.js` — generated list of available languages, scanned from the data files.  


Languages
---------

The links at the top right switch the language; they are generated from `langs.js`.  
The choice is stored in localStorage (`locale`); `data.js` (English, the default) or `data.<lang>.js` is loaded on reload.  
To add a language, create `data.<lang>.js` and run `./setup.sh` again — it rescans the data files, no list to edit by hand.  
