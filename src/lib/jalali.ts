/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dayjs from 'dayjs';
import jalaliday from 'jalaliday';

dayjs.extend(jalaliday);

// @ts-ignore
dayjs.calendar('jalali');

export const formatJalali = (date: string | Date, format = 'YYYY/MM/DD') => {
  return dayjs(date).calendar('jalali').format(format);
};

export const getNowJalali = () => {
  return dayjs().calendar('jalali').format('YYYY/MM/DD');
};

export default dayjs;
