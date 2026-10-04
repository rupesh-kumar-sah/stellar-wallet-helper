import { Transaction } from '@stellar/stellar-sdk';

export interface PolicyRule {
  name: string;
  validate(tx: Transaction): void;
}

export interface MaxAmountRuleOptions {
  maxStroops: string;
}

export interface AllowedDestinationsOptions {
  destinations: string[];
}

export type AllowedDestinationsRuleOptions = AllowedDestinationsOptions;

export type MemoType = 'text' | 'id' | 'hash' | 'return' | 'none';

export interface MemoValidationRuleOptions {
  allowedTypes?: MemoType[];
  maxTextLength?: number;
  requireMemo?: boolean;
}

export interface TurretUploadResponse {
  hash: string;
  signer: string;
  fee: string;
  url: string;
}

export interface LedgerSignerOptions {
  derivationPath?: string; // e.g. "m/44'/148'/0'"
}
