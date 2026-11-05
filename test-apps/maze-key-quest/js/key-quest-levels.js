/* Handcrafted Key Quest level data. Symbols: # wall, P player, B boulder, k key,
   G keyed gate, S/D sun switch/gate, M/N moon switch/gate, E exit.

   Each boulder, key and switch is individually necessity-tested. Freezing one boulder,
   removing one key, or making one switch inert must make its level unwinnable. */
(function(root,factory){var v=factory();if(typeof module!=="undefined"&&module.exports)module.exports=v;else root.KeyQuestLevels=v;})(typeof self!=="undefined"?self:this,function(){
  "use strict";
  return [
    {id:"kq-01",mode:"key",difficulty:"easy",title:"First Push",objective:"The rock fills the only path. Push it into the little hedge pocket.",teaches:"push",min:6,cap:12,map:["#######","###.###","#P.B.E#","#...###","#######"]},
    {id:"kq-02",mode:"key",difficulty:"easy",title:"Make a Lane",objective:"The rock is the doorway. Push from the useful side to make a lane.",teaches:"make-a-lane",min:10,cap:16,map:["#########","#P..#..E#","#...#...#","#...B...#","#########"]},
    {id:"kq-03",mode:"key",difficulty:"easy",title:"Pocket Key",objective:"The gate fills the path. Visit the pocket key before you cross.",teaches:"key",min:9,cap:16,map:["########","#P..G.E#","##.#####","##k#####","########"]},
    {id:"kq-04",mode:"key",difficulty:"easy",title:"Gate Garden",objective:"Pocket the rock, collect the key, then open the garden gate.",teaches:"gate",min:8,cap:20,map:["#########","###.#####","#P.B.G.E#","#k..#####","#########"]},
    {id:"kq-05",mode:"key",difficulty:"medium",title:"Step on the Sun",objective:"Step on the sun, then cross while its blue gate is awake.",teaches:"switch",min:5,cap:12,map:["########","#P.SD.E#","########"]},
    {id:"kq-06",mode:"key",difficulty:"medium",title:"Two Helpful Rocks",objective:"Both rocks block the one path. Give each its own pocket.",teaches:"two-rocks",min:10,cap:24,map:["###########","###.....###","#P.B...B.E#","#...###.###","###########"]},
    {id:"kq-07",mode:"key",difficulty:"medium",title:"Key Behind Stone",objective:"The stone hides the only route to the key. Pocket it first.",teaches:"key-behind-stone",min:9,cap:20,map:["##########","###.######","#P.B.kG.E#","#...######","##########"]},
    {id:"kq-08",mode:"key",difficulty:"medium",title:"Rock Holds the Sun",objective:"Leave the rock on the sun so the whole passage stays open.",teaches:"rock-holds-switch",min:9,cap:18,map:["##########","###S######","#P.B.D..E#","#...######","##########"]},
    {id:"kq-09",mode:"key",difficulty:"hard",title:"Turning Place",objective:"Use the turning spaces to pocket all three rocks.",teaches:"turning-place",min:12,cap:32,map:["###########","###...#.###","#P.B.B.B.E#","#...#...###","###########"]},
    {id:"kq-10",mode:"key",difficulty:"hard",title:"Keys in Order",objective:"Each locked passage needs the key in the pocket before it.",teaches:"keys-in-order",min:17,cap:28,map:["############","#P..G...G.E#","##.###.#####","##k###k#####","############"]},
    {id:"kq-11",mode:"key",difficulty:"hard",title:"Sun and Moon",objective:"Park one rock on the sun and one on the moon to cross both gates.",teaches:"sun-and-moon",min:14,cap:34,map:["#############","###S###M#####","#P.B.D.B.N.E#","#...#...#####","#############"]},
    {id:"kq-12",mode:"key",difficulty:"hard",title:"The Storybook Vault",objective:"Use three rock pockets, a sun gate and the last golden key.",teaches:"vault",min:25,cap:48,map:["###########","##S########","#PB..D.kG.#","#..######.#","###.###.#.#","#E.B...B..#","###..##...#","###########"]}
  ];
});
