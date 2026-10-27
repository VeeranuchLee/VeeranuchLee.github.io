(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HelpMommyMoney=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DEFAULT_CURRENCY=Object.freeze({code:'THB',symbol:'฿',minorUnit:1,displayDecimals:0});
  function integer(value,name='amount'){if(!Number.isSafeInteger(value))throw new TypeError(`${name} must be integer smallest units`);return value;}
  function roundFraction(numerator,denominator){if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||denominator<=0)throw new TypeError('invalid fraction');return Math.floor((numerator+Math.floor(denominator/2))/denominator);}
  function calculateSubtotal(lines){return lines.reduce((sum,line)=>sum+integer(line.unitAmount,'unitAmount')*integer(line.quantity,'quantity'),0);}
  function price(lines,rules={}){const subtotal=calculateSubtotal(lines);const discount=rules.discountBasisPoints?roundFraction(subtotal*integer(rules.discountBasisPoints,'discountBasisPoints'),10000):integer(rules.discountAmount||0,'discountAmount');const discounted=Math.max(0,subtotal-discount);const tax=rules.taxBasisPoints?roundFraction(discounted*integer(rules.taxBasisPoints,'taxBasisPoints'),10000):0;return Object.freeze({subtotal,discount,tax,total:discounted+tax});}
  function format(amount,currency=DEFAULT_CURRENCY){integer(amount);const scale=currency.minorUnit||1;return `${currency.symbol||currency.code}${(amount/scale).toFixed(currency.displayDecimals||0)}`;}
  return{DEFAULT_CURRENCY,integer,roundFraction,calculateSubtotal,price,format};
});
