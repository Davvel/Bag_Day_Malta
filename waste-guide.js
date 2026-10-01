// Common examples, summarised from WasteServ's guide, checked 1 October 2026.
// Full current guidance: https://www.wsm.com.mt/en/newguide
window.WASTE_GUIDE = {
  organic: {
    title:'Organic waste', colour:'White bag', summary:'Food scraps, without packaging.',
    groups:[['Food',['Raw or cooked leftovers','Meat, fish, bones and dairy','Bread, pasta and rice']],['Peels & plants',['Fruit and vegetable peels','Eggshells, flowers and leaves']],['Other',['Tea bags and coffee grounds','Food-soiled napkins and newspaper']]],
    note:'Remove all food packaging.', keepOut:'No plastic, foil, wipes, coffee pods or twigs.'
  },
  recycle: {
    title:'Recyclables', colour:'Grey or green bag', summary:'Paper, plastic and metal packaging.',
    groups:[['Paper & cardboard',['Paper, newspapers and magazines','Cardboard, paper bags and cartons']],['Plastic',['Bottles and clean food containers','Shampoo bottles and detergent containers','Plastic bags, caps and small polystyrene trays']],['Metal',['Food and drink cans','Clean aluminium foil, trays and lids']]],
    note:'Empty containers and rinse away food.', keepOut:'No glass, food, nappies, wipes, batteries or electronics.'
  },
  mixed: {
    title:'Mixed waste', colour:'Black bag', summary:'Waste that cannot be recycled.',
    groups:[['Personal care',['Nappies, sanitary products and wipes','Cotton pads and used masks']],['Household',['Dust, pet litter and used sponges','Torn, stained clothes and worn-out shoes']],['Packaging',['Dirty takeaway boxes and soiled foil','Snack wrappers and coffee pods']]],
    note:'Separate food and recyclable packaging first.', keepOut:'No batteries, electronics, medicines, gas canisters or syringes.'
  },
  glass: {
    title:'Glass bottles & jars', colour:'Reusable container', summary:'Empty glass bottles and food jars.',
    groups:[['Bottles & jars',['Water, wine and oil bottles','Food jars']]],
    note:'Rinse and remove caps or lids.', keepOut:'No broken glass, mirrors, drinking glasses, cookware, ceramics or bulbs.'
  }
};
