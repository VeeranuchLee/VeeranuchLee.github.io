/* Handcrafted Key Quest level data. Symbols: # wall, P player, B boulder, k key,
   G keyed gate, S pressure switch, D switch gate, E exit. */
(function(root,factory){var v=factory();if(typeof module!=="undefined"&&module.exports)module.exports=v;else root.KeyQuestLevels=v;})(typeof self!=="undefined"?self:this,function(){
  "use strict";
  return [
    {id:"kq-01",mode:"key",difficulty:"easy",title:"First Push",objective:"Push one boulder towards the garden door.",min:6,map:["############","#P..B....E.#","#..........#","############"]},
    {id:"kq-02",mode:"key",difficulty:"easy",title:"Make a Lane",objective:"Walk around, then choose the useful side to push.",min:8,map:["############","#P.........#","#..##......#","#..B.....E.#","############"]},
    {id:"kq-03",mode:"key",difficulty:"easy",title:"Pocket Key",objective:"Collect the golden key before the gate.",min:8,map:["#############","#P..k..G..E.#","#...........#","#############"]},
    {id:"kq-04",mode:"key",difficulty:"easy",title:"Gate Garden",objective:"Keep room to push after opening the gate.",min:10,map:["##############","#P.k.G.B...E.#","#............#","##############"]},
    {id:"kq-05",mode:"key",difficulty:"medium",title:"Step on the Sun",objective:"Use the sun switch to open the blue gate.",min:10,map:["##############","#P...S.D...E.#","#..B.........#","##############"]},
    {id:"kq-06",mode:"key",difficulty:"medium",title:"Two Helpful Rocks",objective:"Give each rock enough turning room.",min:10,map:["###############","#P..B.......E.#","#.............#","#..B..........#","###############"]},
    {id:"kq-07",mode:"key",difficulty:"medium",title:"Key Behind Stone",objective:"Push first, then loop back for the key.",min:12,map:["################","#P..B.......G.E#","#......k.......#","################"]},
    {id:"kq-08",mode:"key",difficulty:"medium",title:"Bridge of Buttons",objective:"Use a rock to keep the garden gate awake.",min:14,map:["#################","#P..B.S.D......E#","#...............#","#################"]},
    {id:"kq-09",mode:"key",difficulty:"hard",title:"Turning Place",objective:"Preserve the wide spaces around three rocks.",min:14,map:["##################","#P..B..........E.#","#................#","#..B.......B.....#","##################"]},
    {id:"kq-10",mode:"key",difficulty:"hard",title:"Keys in Order",objective:"Plan a route through two locked gates.",min:16,map:["###################","#P.k.G....k.G....E#","#.................#","###################"]},
    {id:"kq-11",mode:"key",difficulty:"hard",title:"Sun and Moon",objective:"Combine rocks, switches and a key.",min:18,map:["####################","#P..B.S.D.k.G.....E#","#..................#","#.....B............#","####################"]},
    {id:"kq-12",mode:"key",difficulty:"hard",title:"The Storybook Vault",objective:"Use every idea to open the last vault.",min:20,map:["######################","#P..B.S.D..k.G......E#","#....................#","#..B.......B.........#","######################"]}
  ];
});
