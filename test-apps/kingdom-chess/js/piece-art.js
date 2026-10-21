(function(){"use strict";
  var glyph=function(t){return window.ChessIcons?window.ChessIcons.svg("p"+t):"";};
  var folders={unicorn:"princess-unicorn",mermaid:"princess-mermaid",fairy:"sweet-fairy",space:"intergalactic-space",planets:"planets"};
  var names={k:"king",q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"};
  var heights={k:.88,q:.84,b:.78,n:.75,r:.70,p:.58};
  var root="./art/runtime/";
  var boundsPromise=fetch("./js/piece-bounds.json").then(function(r){if(!r.ok)throw Error(r.status);return r.json();});
  function piecePath(kingdom,colourway,type){return root+folders[kingdom]+"/pieces/"+colourway+"-"+names[type]+".webp?v=r8";}
  function assetPath(kingdom,file){return root+folders[kingdom]+"/"+file+".webp?v=r8";}
  function portraitPath(kingdom,type){return root+folders[kingdom]+"/portraits/"+names[type]+".webp?v=r8";}
  function framePath(kingdom){return root+folders[kingdom]+"/frame.webp";}
  function geometry(bound,type,square){
    var scale=Math.min(heights[type]*square/bound.height,.92*square/bound.width);
    return {scale:scale,width:bound.sourceWidth*scale,height:bound.sourceHeight*scale,left:square/2-(bound.x+bound.width/2)*scale,bottom:.06*square-(bound.sourceHeight-bound.y-bound.height)*scale,visibleWidth:bound.width*scale,visibleHeight:bound.height*scale};
  }
  function fit(img){
    var square=img.parentElement.clientHeight,key=img.dataset.file;
    if(!img.naturalWidth||!img.naturalHeight||!square)return fail(img);
    boundsPromise.then(function(data){var bound=data.kingdoms[folders[img.dataset.kingdom]]&&data.kingdoms[folders[img.dataset.kingdom]][key];if(!bound)return fail(img);var g=geometry(bound,img.dataset.type,square);img.style.width=g.width+"px";img.style.height=g.height+"px";img.style.left=g.left+"px";img.style.bottom=g.bottom+"px";img.hidden=false;img.nextElementSibling.hidden=true;img.parentElement.classList.add("has-art");}).catch(function(){fail(img);});
  }
  function fail(img){img.hidden=true;img.parentElement.classList.remove("has-art");if(img.nextElementSibling)img.nextElementSibling.hidden=false;}
  function render(piece,kingdom,colourway){var c=piece===piece.toUpperCase()?"w":"b",t=piece.toLowerCase(),file=colourway+"-"+names[t]+".webp";return '<img class="piece-image" data-type="'+t+'" data-kingdom="'+kingdom+'" data-file="'+file+'" src="'+piecePath(kingdom,colourway,t)+'" alt="" hidden><span class="piece-glyph" aria-hidden="true">'+glyph(t)+'</span>';}
  window.CHESS_PIECE_ART={render:render,fit:fit,fail:fail,geometry:geometry,heights:heights,folders:folders,board:function(k){return assetPath(k,"board");},story:function(k){return assetPath(k,"story");},picker:function(k){return assetPath(k,"picker-card");},piecePath:piecePath,portraitPath:portraitPath,framePath:framePath};
})();
