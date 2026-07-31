/* ============================================================
   STOCKIST — seed catalogue data
   In production this file is replaced by the API: brands,
   products, and orders come from the server (see src/data/api.js).
   ============================================================ */

// ---- catalog tints (muted, refined) ----
export const T = {
  sage:  'oklch(0.90 0.03 150)', clay: 'oklch(0.86 0.045 50)',
  sand:  'oklch(0.91 0.03 85)',  blush:'oklch(0.90 0.035 20)',
  slate: 'oklch(0.87 0.025 250)',cream:'oklch(0.94 0.025 95)',
  fog:   'oklch(0.89 0.012 250)',moss: 'oklch(0.85 0.04 130)',
  rose:  'oklch(0.88 0.04 5)',   stone:'oklch(0.88 0.012 70)',
  ink:   'oklch(0.80 0.03 270)', dune: 'oklch(0.89 0.04 70)',
};

export const BRANDS = [
  { id: 'b1', name: 'Maison Verre',   category: 'Food & Drink', loc: 'Bordeaux, FR',   tagline: 'Sparkling botanicals, naturally pressed.' },
  { id: 'b2', name: 'Kessler & Co',   category: 'Food & Drink', loc: 'Portland, US',    tagline: 'Single-origin coffee, roasted to order.' },
  { id: 'b3', name: 'Atelier Nord',   category: 'Apparel',      loc: 'Copenhagen, DK',  tagline: 'Considered knitwear in natural fibres.' },
  { id: 'b4', name: 'Linea Studio',   category: 'Apparel',      loc: 'Milan, IT',       tagline: 'Tailored essentials, made to last.' },
  { id: 'b5', name: 'Terra Forma',    category: 'Home',         loc: 'Oaxaca, MX',      tagline: 'Hand-thrown stoneware for the table.' },
  { id: 'b6', name: 'Objet Plinth',   category: 'Home',         loc: 'Lisbon, PT',      tagline: 'Sculptural objects for everyday rooms.' },
  { id: 'b7', name: 'Aer Skincare',   category: 'Beauty',       loc: 'Kyoto, JP',       tagline: 'Minimal rituals, botanical actives.' },
  { id: 'b8', name: 'Foundry Goods',  category: 'Accessories',  loc: 'Brooklyn, US',    tagline: 'Hard-wearing leather and brass.' },
];

export const PRODUCTS = [
  // Maison Verre — Food & Drink
  { id:'p1', b:'b1', name:'Yuzu & Verbena Spritz', cat:'Food & Drink', unit:'case of 12', wp:30, rrp:54, moq:4, stock:182, tint:T.sage,  marks:'YV', blurb:'A dry, low-sugar spritz pressed from Japanese yuzu and lemon verbena. Lightly carbonated, no artificial anything. Ships shelf-stable.' },
  { id:'p2', b:'b1', name:'Rhubarb & Rose Tonic',  cat:'Food & Drink', unit:'case of 12', wp:28, rrp:50, moq:4, stock:96,  tint:T.rose,  marks:'RR', blurb:'Tart forced rhubarb balanced with a whisper of rose. A house favourite for spring aperitivo menus.' },
  { id:'p3', b:'b1', name:'Bitter Orange Aperitif',cat:'Food & Drink', unit:'case of 6',  wp:42, rrp:72, moq:4, stock:38,  tint:T.clay,  marks:'BO', blurb:'Non-alcoholic bitter orange, built for the spritz. Deep, complex, properly bitter.' },
  // Kessler & Co
  { id:'p4', b:'b2', name:'Cascade Filter Roast',  cat:'Food & Drink', unit:'6 × 340g', wp:54, rrp:96, moq:2, stock:240, tint:T.sand,  marks:'CF', blurb:'A clean, juicy filter roast — stone fruit and brown sugar. Roasted the day it ships.' },
  { id:'p5', b:'b2', name:'Midnight Espresso',     cat:'Food & Drink', unit:'6 × 340g', wp:54, rrp:96, moq:2, stock:12,  tint:T.stone, marks:'ME', blurb:'Dark, syrupy, cocoa-forward. Pulls a thick crema and holds up to milk.' },
  { id:'p6', b:'b2', name:'Decaf Cordillera',      cat:'Food & Drink', unit:'6 × 340g', wp:50, rrp:90, moq:2, stock:88,  tint:T.cream, marks:'DC', blurb:'Sugarcane-process decaf with none of the compromise. All the body, none of the buzz.' },
  // Atelier Nord — Apparel
  { id:'p7', b:'b3', name:'Lambswool Crew',        cat:'Apparel', unit:'pack of 5', wp:185, rrp:360, moq:2, stock:64,  tint:T.fog,  marks:'LC', blurb:'A mid-weight crew in 100% lambswool, knitted in a family mill. Pre-graded sizes XS–XL.' },
  { id:'p8', b:'b3', name:'Fisherman Rib Beanie',  cat:'Apparel', unit:'pack of 10',wp:120, rrp:230, moq:2, stock:130, tint:T.moss, marks:'RB', blurb:'A chunky rib beanie in undyed merino. Three natural shades per pack.' },
  { id:'p9', b:'b3', name:'Brushed Mohair Scarf',  cat:'Apparel', unit:'pack of 6', wp:168, rrp:312, moq:1, stock:9,   tint:T.dune, marks:'MS', blurb:'Featherlight brushed mohair, generously sized. A reliable gifting hero through Q4.' },
  // Linea Studio
  { id:'p10', b:'b4', name:'Cotton Poplin Shirt',  cat:'Apparel', unit:'pack of 8', wp:208, rrp:392, moq:2, stock:54,  tint:T.cream, marks:'PS', blurb:'A crisp, breathable poplin shirt with a clean placket. Graded XS–XL, two colourways.' },
  { id:'p11', b:'b4', name:'Pleated Wool Trouser', cat:'Apparel', unit:'pack of 6', wp:276, rrp:520, moq:2, stock:31,  tint:T.slate, marks:'WT', blurb:'A single-pleat trouser in Italian wool, tailored with a relaxed leg.' },
  { id:'p12', b:'b4', name:'Silk-Blend Tee',       cat:'Apparel', unit:'pack of 10',wp:150, rrp:280, moq:2, stock:120, tint:T.blush, marks:'ST', blurb:'An elevated everyday tee with a touch of silk for drape and sheen.' },
  // Terra Forma — Home
  { id:'p13', b:'b5', name:'Stoneware Dinner Set', cat:'Home', unit:'set of 4', wp:88, rrp:168, moq:3, stock:46,  tint:T.clay,  marks:'DS', blurb:'Hand-thrown stoneware in a warm speckle glaze. Microwave and dishwasher safe.' },
  { id:'p14', b:'b5', name:'Ribbed Serving Bowl',  cat:'Home', unit:'each',     wp:34, rrp:68,  moq:6, stock:74,  tint:T.sand,  marks:'SB', blurb:'A generous ribbed bowl thrown to a satisfying weight. Every piece slightly unique.' },
  { id:'p15', b:'b5', name:'Matte Mug, Set of 2',  cat:'Home', unit:'set of 2', wp:26, rrp:52,  moq:6, stock:8,   tint:T.moss,  marks:'MM', blurb:'A daily mug with a comfortable handle and a soft matte exterior.' },
  // Objet Plinth
  { id:'p16', b:'b6', name:'Travertine Catch-All', cat:'Home', unit:'each', wp:46, rrp:92,  moq:4, stock:52, tint:T.stone, marks:'TC', blurb:'A solid travertine tray for keys, rings and small ceremonies. Each stone unique.' },
  { id:'p17', b:'b6', name:'Alabaster Tealight',   cat:'Home', unit:'pair', wp:58, rrp:116, moq:3, stock:40, tint:T.cream, marks:'AT', blurb:'Carved alabaster holders that glow warmly when lit. Sold as a sculptural pair.' },
  { id:'p18', b:'b6', name:'Burl Wood Bookend',    cat:'Home', unit:'pair', wp:72, rrp:140, moq:2, stock:22, tint:T.dune,  marks:'BB', blurb:'Weighty burl-veneer bookends with a hand-oiled finish.' },
  // Aer Skincare — Beauty
  { id:'p19', b:'b7', name:'Camellia Cleansing Oil',cat:'Beauty', unit:'pack of 12', wp:144, rrp:264, moq:2, stock:160, tint:T.cream, marks:'CO', blurb:'A featherlight cleansing oil that melts away the day. Fragrance from botanicals only.' },
  { id:'p20', b:'b7', name:'Rice Enzyme Polish',   cat:'Beauty', unit:'pack of 12', wp:132, rrp:240, moq:2, stock:54,  tint:T.sand,  marks:'EP', blurb:'A gentle enzymatic powder that activates with water. Leaves skin genuinely soft.' },
  { id:'p21', b:'b7', name:'Hinoki Hand Balm',     cat:'Beauty', unit:'pack of 20', wp:120, rrp:220, moq:2, stock:6,   tint:T.moss,  marks:'HB', blurb:'A fast-absorbing hand balm scented with Japanese cypress. A counter-side bestseller.' },
  // Foundry Goods — Accessories
  { id:'p22', b:'b8', name:'Bridle Leather Belt',  cat:'Accessories', unit:'pack of 6', wp:174, rrp:330, moq:2, stock:48, tint:T.clay,  marks:'LB', blurb:'A 35mm belt in English bridle leather with a solid brass buckle. Ages beautifully.' },
  { id:'p23', b:'b8', name:'Brass Key Fob',        cat:'Accessories', unit:'pack of 12',wp:96,  rrp:180, moq:2, stock:140,tint:T.dune,  marks:'KF', blurb:'A weighty cast-brass fob that develops a rich patina. A perfect impulse add-on.' },
  { id:'p24', b:'b8', name:'Waxed Canvas Tote',    cat:'Accessories', unit:'pack of 4', wp:152, rrp:288, moq:2, stock:18, tint:T.fog,   marks:'CT', blurb:'A structured waxed-canvas tote with leather handles. Built to be beaten up.' },
];

export const CATEGORIES = ['Food & Drink', 'Apparel', 'Home', 'Beauty', 'Accessories'];

export const seedOrders = () => ([
  { id:'ORD-4471', retailer:'Maison Bleu', items:[
      { id:'p4', qty:6 }, { id:'p1', qty:8 } ],
    status:'shipped', placedAt: Date.now() - 1000*60*60*52, note:'' },
  { id:'ORD-4468', retailer:'Maison Bleu', items:[
      { id:'p13', qty:6 }, { id:'p16', qty:8 }, { id:'p17', qty:4 } ],
    status:'packing', placedAt: Date.now() - 1000*60*60*6, note:'' },
]);
