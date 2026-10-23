// Fixture content for "Salt Line", a 12-minute short. Fake AI results are canned; nothing is generated.
const OPTS=[
{id:'A',name:'The Long Crossing',summary:'A slow, elegiac last ferry. The island is lost in three quiet movements.',
 attrs:{Tone:'Quiet, elegiac','Structural emphasis':'Three slow acts',Ending:'Open','Est. runtime':'~11 min'},
 paras:['Marit has run the Skerry ferry for twenty years. Tonight, in fog, she makes the crossing for the last time, and nobody on board knows it.','A stranger with a locked case asks to be put ashore before midnight. She agrees, and the case sits between them like a third passenger.','Halfway over, the engine dies. Marit tells the stranger a story about the channel; he tells her what is in the case.','She lets the current carry them in. At dawn the pier is empty and the light is already going out.']},
{id:'B',name:'Last Ferry',summary:'One night, near real time. A secret cargo forces Marit to choose who learns the truth first.',
 attrs:{Tone:'Tense, intimate','Structural emphasis':'Single night, real time',Ending:'Bittersweet','Est. runtime':'~9 min'},
 paras:['Marit has kept the Skerry ferry running for twenty years, and tonight is its last crossing. The council has sold the route; nobody has told the island.','A stranger boards with a locked case and asks to be put ashore before midnight. Marit senses the case is the reason the route was sold.','Mid-channel the engine fails. In the dark they argue, and the case is opened: letters from every island family, unsent for decades.','Marit rows the stranger the last mile by hand. At dawn the island finds out together, from her, on the pier.']},
{id:'C',name:'Salt Line',summary:'Braided past and present. Marit\u2019s first crossing as a girl answers her last.',
 attrs:{Tone:'Wistful, warm','Structural emphasis':'Braided timelines',Ending:'Reconciled','Est. runtime':'~13 min'},
 paras:['Two crossings, thirty years apart. Girl-Marit rides beside her father; Marit the ferrywoman rides alone, closing the route he opened.','The stranger who boards tonight carries her father\u2019s old logbook. Each page he reads aloud cuts to the crossing it describes.','When the engine fails, the past and present boats share one frame, drifting. Marit finally hears what her father wrote about her.','She docks at dawn. Girl-Marit steps off the old boat, and the grown Marit steps off the new one, onto the same pier.']}];
const ALTS=[
{id:'D',name:'Tide Table',summary:'A procedural take: the ferry timetable becomes the story\u2019s clock.',attrs:{Tone:'Dry, wry','Structural emphasis':'Timetable as structure',Ending:'Ironic','Est. runtime':'~8 min'},
 paras:['The 21:40 to Skerry has never been late. Marit built her life around that sentence, and tonight she will break it.','A stranger and a locked case turn the timetable into a countdown. Each stop on the board is a decision.','The engine failure is the first honest delay in twenty years. She narrates it to the passenger as if it were scheduled.','The island wakes to a ferry that arrives at 05:12. Nobody knows what to do with the number.']},
{id:'E',name:'Salt and Letters',summary:'Letter-led: the case is a mailbag and the island is its addressee.',attrs:{Tone:'Tender, quiet','Structural emphasis':'Letters as set pieces',Ending:'Hopeful','Est. runtime':'~10 min'},
 paras:['Marit\u2019s last job is also her first act of defiance: she will deliver the mail the council cancelled.','The stranger is a retired clerk. His case holds twenty years of unsent post, sorted by family.','Mid-channel they read three letters aloud. The engine dies on the one addressed to Marit.','She rows the rest. The pier fills with people who already know, because someone finally wrote.']}];
const MY1='A stranger boards with a salt-stained case and a story about his father.';
const MY1B=' Marit lets him lie, because she is tired of being the only one who knows things.';
const MY3='At dawn the island learns it together, from her, on the pier.';
const BEATS=[
{t:'Marit prepares the ferry for its final night.',link:0,prov:'ai'},
{t:'A stranger with a locked case boards.',link:1,prov:'ai'},
{t:'Engine failure mid-channel; Marit lies about the cause.',link:2,prov:'creator',drift:true,fromT:'Engine failure mid-channel; they argue in the dark.',treatNow:'Mid-channel the engine fails. In the dark they argue, and the case is opened: letters from every island family, unsent for decades.',treatNew:'Mid-channel the engine fails. Marit lies about the cause, and in the dark the stranger opens the case: letters from every island family, unsent for decades.'},
{t:'The case is opened: unsent letters.',link:2,prov:'ai'},
{t:'Marit refuses help and rows alone; the stranger takes the oars at the last bend.',link:3,prov:'creator',drift:true,fromT:'Marit rows the last mile by hand.',treatNew:'Marit refuses all help and rows alone; at the last bend the stranger takes an oar. '+MY3},
{t:'Dawn: she tells the island on the pier.',link:3,prov:'ai'},
{t:'Epilogue: the empty slip, the light going out.',link:null,prov:'ai'}];
const SCENES=[
{h:'INT. FERRY ENGINE ROOM \u2013 DUSK',min:2,beats:[0],ls:[['a','Marit oils the old diesel. Twenty years of her fingerprints on every valve.'],['d','MARIT: One more night, you old liar.'],['a','Rust flakes from the brass plate: SKERRY LINE.','ai1']]},
{h:'EXT. SKERRY PIER \u2013 NIGHT',min:3,beats:[1],ls:[['a','Fog. A STRANGER, 50s, waits with a locked case.'],['d','STRANGER: Before midnight. I\u2019ll pay double.'],['a','A gull lands on the case, then thinks better of it.','ai2']]},
{h:'EXT. CHANNEL \u2013 NIGHT',min:4,beats:[2,3,4],ls:[['a','The engine coughs, catches, dies. Silence, then water.'],['d','MARIT: Loose connection. Happens.'],['a','She has never once lied about the engine.','ai3'],['a','Letters spill across the deck, hundreds, addressed by hand.']]},
{h:'EXT. SKERRY PIER \u2013 DAWN',min:2.5,beats:[5,6],ls:[['a','Marit ties off the boat with the stranger\u2019s help.'],['d','MARIT: There was a letter for each of you.'],['a','The slip behind her is empty. The lamp goes out.','ai4']]}];
const NOTES0=[{i:1,t:'Is the stranger too convenient? Try making him a former council clerk.'},{i:3,t:'Dawn pier scene: keep the island off camera until the last shot.'}];
