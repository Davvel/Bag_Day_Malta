// Complete bag/container lists from https://www.wastecollection.mt/
// Checked 1 October 2026. Duplicate plastic bottles and sanitary items removed.
window.WASTE_GUIDE = {
  organic: {
    title:'Organic waste', colour:'White bag', summary:'Food scraps and other organic items.',
    groups:[['Food & leftovers',[
      'Cheese','Coffee','Cooked food','Leftovers','Cooked or raw meat','Dairy products',
      'Eggs and eggshells','Expired food — without packaging','Fish','Honey','Pasta',
      'Raw food','Rotten fruit and vegetables','Sugar','Spreads, such as honey and butter'
    ]],['Peels, shells & plants',[
      'Flowers','Fruit and vegetable peels','Leaves','Nut shells','Seafood shells',
      'Fish and meat bones','Fruit stones'
    ]],['Other organic items',[
      'Food-soiled newspapers','Food-soiled napkins','Tea bags','Tea leaves'
    ]]],
    note:'Remove all food packaging.', keepOut:'No plastic, foil, wipes, coffee pods or twigs.'
  },
  recycle: {
    title:'Recyclables', colour:'Grey or green bag', summary:'Paper, plastic and metal packaging.',
    groups:[['Paper & cardboard',[
      'Cardboard','Clean carton food boxes','Detergent boxes','Magazines',
      'Milk and juice cartons','Newspapers','Notebooks','Paper','Clean paper bags',
      'Clean takeaway boxes','Toilet paper rolls'
    ]],['Plastic',[
      'Cooking oil bottles','Clean cosmetic containers','Empty detergent bottles',
      'Empty liquid soap containers','Plastic bottles','Clean margarine tubs',
      'Clean plastic bags','Plastic caps','Plastic containers','Plastic food packets',
      'Polystyrene','Empty shampoo bottles','Empty shower gel bottles',
      'Clean toiletry containers','Clean yoghurt containers'
    ]],['Metal',[
      'Clean aluminium trays and foil','Beverage cans','Food cans','Jar lids',
      'Metal caps','Empty spray cans'
    ]]],
    note:'Empty containers and rinse away food. Milk and juice cartons belong here.',
    keepOut:'No glass, food, nappies, wipes, batteries or electronics.'
  },
  mixed: {
    title:'Mixed waste', colour:'Black bag', summary:'Waste that cannot be recycled.',
    groups:[['Packaging & paper',[
      'Adhesive tape','Soiled aluminium foil','Baking paper','Dirty food wrappers',
      'Cellophane tape','Dirty takeaway boxes','Foil-coated packets','Labels',
      'Photographs','Stickers','Toothpaste tubes','Wax paper','Snack packets'
    ]],['Household items',[
      'Broken ceramics and Pyrex','Dust','Plant pots','Used sponges','Shoes',
      'Human and animal hair','Small broken mirrors','Used cleaning materials',
      'Used rubber gloves','Used floor cloths','Cigarette butts and ashes',
      'Candles','CDs','Toothpicks','Ice lolly sticks and wooden skewers','Twigs'
    ]],['Sanitary & pet waste',[
      'Sanitary items','Wet wipes','Animal waste and pet litter','Nappies'
    ]]],
    note:'Separate food and recyclables first. Clean milk cartons go in recycling.',
    keepOut:'No batteries, electronics, medicines, gas canisters or syringes.'
  },
  glass: {
    title:'Glass bottles & jars', colour:'Reusable container', summary:'Glass bottles and jars only.',
    groups:[['Glass collection',['Glass bottles','Glass jars']]],
    note:'Use a reusable container. Rinse bottles and jars and remove caps or lids.',
    keepOut:'No broken glass, mirrors, drinking glasses, cookware, ceramics or bulbs.'
  }
};
