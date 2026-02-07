import { parsePackageList } from './src/utils/parsePackageList.ts';

const input = 'C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO\t3901\t1/30/2026 6:57:06 PM';

const result = parsePackageList(input);
console.log('Packages:', result.packages);
console.log('Errors:', result.errors);
