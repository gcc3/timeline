
Timeline
========


A simple timeline app base on [timeline-api](https://github.com/gcc3/timeline-api).  


Setup
-----

Run `./setup.sh`. It creates local copies from the `.example` files and generates `langs.js`:

- `config.js` — timeline bands and initial date.  
- `langs.js` — generated list of available languages, scanned from the `data/` folder.  

The event data is not in the repo. Write at least one `data/<lang>.js` yourself
(e.g. `data/en.js`) holding the page title and events, then run `./setup.sh`
again so `langs.js` picks it up. Without one the page loads empty.

Then open `index.html` in a browser.  


Events
------

A `data/<lang>.js` file sets `title` and groups its events into one or more
named objects (`tl_renaissance`, `tl_world_war`, …), then lists those groups in a
`timelines` array at the bottom. `config.js` loads every group in that array onto
the one shared set of bands, so adding a group means defining it and appending it
to `timelines` — no change to `config.js`.

Dates are ISO 8601. BC years use astronomical numbering, where year 0 is 1 BC,
so `"-0469"` is 470 BC.  


Languages
---------

The dropdown at the top right switches the language; it is generated from `langs.js`.  
The choice is stored in localStorage (`locale`); the matching `data/<lang>.js` is loaded on reload (default: `en`).  
To add a language, create `data/<lang>.js` and run `./setup.sh` again — it rescans the `data/` folder, no list to edit by hand.  
