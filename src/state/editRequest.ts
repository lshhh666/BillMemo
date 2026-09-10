import type { Transaction } from '../types';

// 首页发起"编辑某条记录"后跳到记账页，记账页在获得焦点时取走这个请求进入编辑模式
let pending: Transaction | null = null;

export function requestEdit(transaction: Transaction) {
  pending = transaction;
}

export function takeEditRequest(): Transaction | null {
  const request = pending;
  pending = null;
  return request;
}
