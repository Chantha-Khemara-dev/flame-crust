import { BakongKHQR, MerchantInfo } from "bakong-khqr";
const qrInfo = new MerchantInfo("kanekira@acleda", "Flame Crust", "Phnom Penh", 10.00, "USD", "STORE1", "TERM1");
const khqr = new BakongKHQR();
const res = khqr.generateMerchant(qrInfo);
console.log(res);
