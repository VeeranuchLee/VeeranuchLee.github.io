import {BalanceConfig as C,tile} from './balance-config.js';
const map={A1:tile('A','1'),A3:tile('A','3'),A9:tile('A','9'),A27:tile('A','27'),A81:tile('A','81'),B1:tile('B','๑'),B3:tile('B','๓'),B9:tile('B','๙')};
export class ShopEngine{constructor(s,q){this.s=s;this.q=q}buy(id){if(!(id in C.prices)||this.s.shopStock[id]<=0||this.s.credits<C.prices[id])return false;if(map[id]&&this.s.activePurchasedTile)return false;this.s.credits-=C.prices[id];this.s.shopStock[id]--;if(map[id])return this.q.insertPurchased(map[id]);this.s.inventory[id]++;return true}}
