(function(){
"use strict";
function fact(icon,label,value,qualifier,say){return {icon:icon,label:label,value:value,qualifier:qualifier||"",say:say||[label,value,qualifier].filter(Boolean).join(" ")}}
var F={
1:[fact("venus","Brightest planet","Venus","in the night sky","Venus is the brightest planet in the night sky."),fact("mars","Rusty dust","Mars","looks red","Mars looks red because its dust is rusty."),fact("jupiter","Giant planet","11 Earths","wide","Jupiter is about 11 Earths wide."),fact("star","Makes its own","LIGHT","planets reflect sunlight","Planets shine with the Sun's light. Stars make their own.")],
2:[fact("diameter","Sun diameter","1.39 million km","about 109 Earths wide","Diameter: about 1.39 million km (about 109 Earths wide)"),fact("temperature","Surface temperature","5,500°C","about","Surface temperature: about 5,500°C"),fact("light","Sunlight to Earth","8 minutes","about","Sunlight takes about 8 minutes to reach Earth."),fact("distance","Next star","40 trillion km","about","The next-closest star is about 40 trillion km away."),fact("clock","Its light takes","4 years","about","Its light takes about 4 years to reach us.")],
3:[fact("core","Core temperature","15 million°C","about","Core temperature: about 15 million°C"),fact("temperature","Surface temperature","5,500°C","about","Surface temperature: about 5,500°C"),fact("atoms","Stars are mostly","HYDROGEN","and helium","Stars are mostly hydrogen and helium gas."),fact("clock","Sun's age","4.6 billion years","about","The Sun has been shining for about 4.6 billion years."),fact("gravity","Solar-system glue","GRAVITY","holds the family together","The Sun's gravity helps keep the solar system together.")],
4:[fact("dwarf","Most common","RED DWARFS","small, long-lived stars","Red dwarfs are the most common stars of all."),fact("diameter","Sun diameter","1.39 million km","about 109 Earths wide","Diameter: about 1.39 million km (about 109 Earths wide)"),fact("giant","Arcturus","25 Suns wide","about","Arcturus, a giant, is about 25 times wider than the Sun."),fact("supergiant","Betelgeuse","HUNDREDS","of Suns wide","Betelgeuse, a supergiant, is hundreds of times wider than the Sun."),fact("clock","Red-dwarf life","TRILLIONS","of years","A red dwarf can shine for trillions of years.")],
5:[fact("blue","Blue-white stars","OVER 10,000°C","the hottest","Blue-white stars are the hottest: over 10,000°C."),fact("sun","Our yellow-white Sun","5,500°C","about","Our Sun is yellow-white: about 5,500°C"),fact("red","Red stars","3,000°C","about; the coolest","Red stars are the coolest: about 3,000°C."),fact("orange","Betelgeuse","3,300°C","red-orange; about","Betelgeuse looks red-orange. About 3,300°C."),fact("blue","Rigel","12,000°C","blue-white; about","Rigel looks blue-white. About 12,000°C.")]
};
/* Plate-percent geometry used by the browser pointer audit. Object boxes are
   the painted targets [left, top, width, height], not pointer tolerances. */
var pointerObjectBoxes={
1:[[54.7,15.7,2,2.5],[84.4,27.1,4.3,4.5],[79.8,15.6,6.5,6.4],[75.2,32.1,2,2.1]],2:[[33,45,19,20],[89.3,59.7,1.5,2.5],[82.4,59.6,1.4,2.4]],3:[[48,18,18,20],[65,18,18,20],[62,31,19,18]],4:[[36.5,51.5,3.3,4.5],[46.4,46.7,5.8,7.5],[57,40.5,10.7,15.7],[75,17,21.5,28]],5:[[34,35,9.5,13.5],[55,21,14,18],[82,33,11.5,15]],6:[[39.5,39.3,11,15],[39.7,41,12,16]],7:[[92.7,18.5,4.5,7]],9:[[45.5,16,49,37]],10:[[36.5,15,61.5,41],[36.5,15,61.5,41]],11:[[37,20,23,17],[61,31,18,17]],12:[[42,19,17,17],[59,31,17,17]],13:[[37.3,29.7,6.3,4.5],[56.5,27.5,7.8,7.8],[88.5,27,6.8,7.8]],14:[[45.3,34.7,1.8,3],[49.2,35.6,2.1,3.3],[68.6,35.9,2.2,3.8]],15:[[48,14,20,23],[64,34,9,9]],16:[[35.2,50.3,6.5,8],[34.3,37.5,8,10],[34.5,17,10,13]],17:[[55,18,22,28]],18:[[4.2,35.2,3,3.5],[35,33,12,15],[58,32,9,14],[77,30,13,15]],19:[[81,32,11,13],[72,24,17,18]]};
pointerObjectBoxes[6]=[[59,23.5,5,6],[59,44,7,8]];pointerObjectBoxes[7]=[null,[92.7,24,4.5,7]];pointerObjectBoxes[9]=[[71,30,5,5]];pointerObjectBoxes[10]=[[75,28,7,7],[87,33,7,7]];pointerObjectBoxes[11]=[[47,19,10,10],[61,31,18,17]];pointerObjectBoxes[14][2]=[66.5,35.9,3,4];pointerObjectBoxes[17]=[[55,18,22,28]];
var pointerTipCorrections={6:{0:[61.5,26.5]},7:{1:[94.8,27.2]},9:{0:[73.3,32.7]},10:{0:[78.4,31.4],1:[90.5,36.7]},11:{0:[51,24]},13:{0:[38.2,32.7]},14:{2:[67.9,38]},16:{0:[41.2,53],2:[41.5,23.5]},17:{0:[65.5,31.5]},18:{0:[5.5,38.2]}};
/* Explicit label-only corrections preserve the painted-object tips. Unlike a
   blanket clamp, these offsets move only the labels named by browser QA and
   preserve every other measured label/pointer relationship. */
var pointerLabelCorrections={1:{1:[91,36],3:[72,43]},2:{1:[91,40],2:[81,50]},3:{1:[78,23]},4:{3:[76,23]},13:{0:[45,55]},15:{0:[56,23]},18:{0:[17,55],2:[58,25],3:[87,48]},19:{0:[91,48]}};
var pointerlessFeatures={13:[0],18:[0]};
function applyPointerCorrections(pageData){var fixes=pointerTipCorrections[pageData.number]||{},labels=pointerLabelCorrections[pageData.number]||{},plain=pointerlessFeatures[pageData.number]||[];Object.keys(fixes).forEach(function(i){pageData.features[i].tipX=fixes[i][0];pageData.features[i].tipY=fixes[i][1]});Object.keys(labels).forEach(function(i){pageData.features[i].x=labels[i][0];pageData.features[i].y=labels[i][1]});plain.forEach(function(i){delete pageData.features[i].tipX;delete pageData.features[i].tipY});return pageData}
/* Ari and Dot are painted into these eight flat plates. These plate-percent
   safe boxes follow the smaller 2026-11-06 repaints and reserve only the
   visible character group (plus Page 20's telescope interaction), so live
   knowledge cards can use the space reclaimed around the old silhouettes. */
var characterBoxes={1:[[37,40,20,28]],2:[[18,27,22,18]],3:[[10,40,31,25]],7:[[1,47,28,15]],9:[[7,42,26,24]],12:[[9,50,18,17]],17:[[9,45,18,13]],20:[[6,46,21,28]]};
var diagramBoxes={1:[[40,3,58,65]],2:[[35,32,63,38]],3:[[45,3,53,62]],4:[[33,4,65,66]],5:[[33,4,65,66]],6:[[33,4,65,66]],7:[[33,4,65,66]],8:[[33,4,65,66]],9:[[35.5,4,62.5,66]],10:[[33,4,65,66]],11:[[33,4,65,66]],12:[[40,4,58,66]],13:[[33,4,65,66]],14:[[33,4,65,66]],15:[[33,4,65,66]],16:[[33,4,65,66]],17:[[43,4,55,66]],18:[[33,4,65,66]],19:[[33,4,65,66]],20:[[42,4,56,66]]};
/* The painted story frame on every plate, as plate percent [left, top, width,
   height] of the frame's inner rectangle: inside the glowing border line, so a
   card placed here never sits on the glow. Measured 2026-11-06 from the
   1448x1086 plates (pages 1, 2, 3, 7, 12, 17 and 20 are the smaller-Ari
   repaints) by walking out from the frame's centre to where the glow meets the
   dark painting, then stepping 12 plate pixels in. In landscape the story card
   is this rectangle less storyFit.insetPct on each side; portrait keeps its
   reading band below the painting. */
var storyFrames={1:[4.1,7.7,34.5,24.7],2:[3.2,4.2,57.1,21],3:[2.9,4.1,41.2,35.5],4:[3.4,8.4,25.1,35.2],5:[2.8,9.1,25.8,34.9],6:[2.8,8.3,26.1,40.6],7:[2.7,9.2,24.5,34.4],8:[2.6,9.1,25.3,35],9:[3.2,6.4,31.1,28.5],10:[2.6,8.4,25.6,36.2],11:[2.7,8.7,25.3,35.8],12:[2.6,6.5,25.4,34],13:[2.5,6.5,25.6,35.5],14:[2.6,6.5,25.6,35.5],15:[2.6,6.5,25.5,34],16:[2.6,6.4,25.6,34],17:[2.6,6.4,25.6,32.5],18:[2.6,6.4,25.6,34],19:[2.6,6.4,25.6,33.5],20:[2.6,6.4,25.6,34]};
/* The story card's type is shrunk in steps (title, subtitle and story text
   together, all in proportion to the story text) until the card has nothing to
   scroll. It never goes below bodyFloorPx: a card that still overflows at the
   floor grows past its frame and is reported by qc/check-story-fit.mjs rather
   than clipped, scrolled or made unreadably small. */
var storyFit={insetPct:.4,bodyMaxPx:17,bodyFloorPx:15,stepPx:.5};
window.STARLIGHT_SLICE_ONE={
pointerObjectBoxes:pointerObjectBoxes,
characterBoxes:characterBoxes,
diagramBoxes:diagramBoxes,
storyFrames:storyFrames,
storyFit:storyFit,
cover:{title:"Follow the Starlight",prompt:"Tap the starlight beam to begin.",line:"Follow the Starlight."},
pages:{
1:{eyebrow:"A new mystery",title:"The lights outside",subtitle:"A quiet night under the stars",story:"Ari knows three lights from their first journey. Dot finds one light that makes its own glow.",about:"Planets look bright because they reflect sunlight. A star is different: it makes light and heat inside itself.",aboutLabel:"About the lights",facts:F[1],kind:"lights",features:[{label:"Venus",x:53.8,y:17.2,spoken:true},{label:"Jupiter",x:82.9,y:17.8,spoken:true},{label:"Mars",x:86.4,y:29.2,spoken:true},{label:"A star",x:76.2,y:33.3,spoken:true}]},
2:{eyebrow:"Looking from far away",title:"Our Sun is a star",subtitle:"Distance changes how big a light looks",story:"From far away, even our enormous Sun becomes one tiny point among the others.",about:"The Sun only looks larger than other stars because it is much closer to Earth. From far away it would be one point of light.",aboutLabel:"About our Sun",facts:F[2],kind:"points",features:[{label:"Near: looks big",x:57,y:55,tipX:42.5,tipY:58,spoken:true},{label:"Far: looks tiny",x:91,y:37,tipX:90.1,tipY:61,spoken:true},{label:"Our Sun from far away",x:83,y:46,tipX:83.1,tipY:60.6}]},
3:{eyebrow:"Inside a star",title:"What is a star?",subtitle:"Two forces keep a star steady",story:"Gravity pulls inward. Pressure from the hot core pushes outward. A steady star needs both.",about:"A star is a huge sphere of hot plasma. Gravity squeezes it inward while energy from its core pushes outward.",aboutLabel:"About a star",facts:F[3],kind:"balance",features:[{label:"Gravity pulls in",x:53,y:18,tipX:57,tipY:27},{label:"Pressure pushes out",x:78,y:18,tipX:74,tipY:27},{label:"Together: a steady star",x:83,y:49,tipX:72,tipY:42}],explainStep:2,motion:{type:"living-star-balance",crop:{x:46.96,y:2.95,w:49.72,h:55.25},frames:["assets-runtime/standard/page-03-star-frame-01.webp","assets-runtime/standard/page-03-star-frame-02.webp","assets-runtime/standard/page-03-star-frame-03.webp","assets-runtime/standard/page-03-star-frame-04.webp"],ms:460,underPlate:"assets-runtime/standard/page-03-star-underplate.webp",reducedEnd:"balanced state with arrows and tint; no scale"}},
4:{eyebrow:"A family of sizes",title:"Some stars are enormous",subtitle:"Our Sun belongs near the middle",story:"Stars come in many sizes. Our Sun sits between tiny red dwarfs and enormous giants.",about:"A star's size depends on its mass and life stage. Red dwarfs are small; giants and supergiants can spread far beyond the Sun.",aboutLabel:"About star sizes",facts:F[4],kind:"sizes",features:[{label:"Red dwarf",x:38,y:47,tipX:38.1,tipY:53.7,spoken:true},{label:"Our Sun",x:49,y:43,tipX:49.3,tipY:50.5},{label:"Giant",x:57,y:35,tipX:62.3,tipY:48.3,spoken:true},{label:"Supergiant",x:76,y:19,tipX:92,tipY:32,spoken:true}]},
5:{eyebrow:"Reading starlight",title:"Colour and temperature",subtitle:"A star's colour is a thermometer",story:"Star colour is evidence. Blue-white stars are hotter than red stars—the opposite of many taps.",about:"Stars glow in different colours because their surfaces have different temperatures. Blue-white means hotter; red means cooler.",aboutLabel:"About star colour",facts:F[5],kind:"colours",features:[{label:"Cooler red",x:39,y:54,tipX:38.7,tipY:42.2},{label:"Yellow-white",x:62,y:43,tipX:62.1,tipY:30},{label:"Hotter blue-white",x:88,y:54,tipX:87.8,tipY:41.5}]}
}};
Object.keys(window.STARLIGHT_SLICE_ONE.pages).forEach(function(n){applyPointerCorrections(window.STARLIGHT_SLICE_ONE.pages[n])});
window.StarlightRegisterPage=function(pageData){window.STARLIGHT_SLICE_ONE.pages[pageData.number]=applyPointerCorrections(pageData)};
})();
