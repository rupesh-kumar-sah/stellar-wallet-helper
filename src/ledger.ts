import { Transaction } from "@stellar/stellar-sdk";
import {
  LedgerSignerOptions,
  LedgerTransport,
  LedgerTransportType,
  WebUsbTransportOptions,
  WebBleTransportOptions,
  WebHidTransportOptions,
} from "./types";

export class LedgerTransportError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "TRANSPORT_ERROR") {
    super(message);
    this.name = "LedgerTransportError";
    this.code = code;
  }
}

export class DeviceNotConnectedError extends LedgerTransportError {
  constructor(message: string = "Ledger hardware device is not connected") {
    super(message, "DEVICE_NOT_CONNECTED");
    this.name = "DeviceNotConnectedError";
  }
}

export class UserRejectedError extends LedgerTransportError {
  constructor(message: string = "User rejected action on Ledger device") {
    super(message, "USER_REJECTED");
    this.name = "UserRejectedError";
  }
}

export class UnsupportedTransportError extends LedgerTransportError {
  constructor(transportType: string) {
    super(
      `Transport '${transportType}' is not supported in the current environment`,
      "UNSUPPORTED_TRANSPORT"
    );
    this.name = "UnsupportedTransportError";
  }
}

function getGlobalNavigator(): any {
  const g = typeof globalThis !== "undefined" ? (globalThis as any) : undefined;
  return g ? g.navigator || (g.window && g.window.navigator) : undefined;
}

/**
 * Concrete WebUSB transport implementation for Ledger devices.
 * Uses WebUSB API for cross-browser hardware wallet communication.
 */
export class WebUsbTransport implements LedgerTransport {
  public readonly type: LedgerTransportType = "webusb";
  private connected: boolean = false;
  private options: WebUsbTransportOptions;

  constructor(options?: WebUsbTransportOptions) {
    this.options = options || {};
  }

  public async isSupported(): Promise<boolean> {
    if (this.options.device) {
      return true;
    }
    const nav = getGlobalNavigator();
    return Boolean(nav && "usb" in nav);
  }

  public async connect(): Promise<void> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new UnsupportedTransportError(this.type);
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.open === "function"
      ) {
        await this.options.device.open();
      }
      this.connected = true;
    } catch (error: any) {
      throw new LedgerTransportError(
        `WebUSB connection failed: ${error.message}`,
        "CONNECTION_FAILED"
      );
    }
  }

  public async close(): Promise<void> {
    if (
      this.options.device &&
      typeof this.options.device.close === "function"
    ) {
      await this.options.device.close();
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async getPublicKey(derivationPath: string): Promise<string> {
    if (!this.connected && !this.options.device) {
      await this.connect();
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.getPublicKey === "function"
      ) {
        return await this.options.device.getPublicKey(derivationPath);
      }
      throw new DeviceNotConnectedError(
        "WebUSB Ledger device not found or interface unavailable"
      );
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new LedgerTransportError(
        `WebUSB failed to retrieve public key: ${error.message}`,
        "GET_PUBLIC_KEY_FAILED"
      );
    }
  }

  public async signTransaction(
    derivationPath: string,
    txSignatureBase: Buffer | Uint8Array
  ): Promise<Buffer | Uint8Array> {
    if (!this.connected && !this.options.device) {
      await this.connect();
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.signTransaction === "function"
      ) {
        return await this.options.device.signTransaction(
          derivationPath,
          txSignatureBase
        );
      }
      throw new DeviceNotConnectedError(
        "WebUSB Ledger device not found or interface unavailable"
      );
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new LedgerTransportError(
        `WebUSB failed to sign transaction: ${error.message}`,
        "SIGN_TRANSACTION_FAILED"
      );
    }
  }
}

/**
 * Concrete WebBluetooth (WebBle) transport implementation for Ledger devices.
 * Uses Web Bluetooth API for mobile and wireless hardware wallet communication.
 */
export class WebBleTransport implements LedgerTransport {
  public readonly type: LedgerTransportType = "webble";
  private connected: boolean = false;
  private options: WebBleTransportOptions;

  constructor(options?: WebBleTransportOptions) {
    this.options = options || {};
  }

  public async isSupported(): Promise<boolean> {
    if (this.options.device) {
      return true;
    }
    const nav = getGlobalNavigator();
    return Boolean(nav && "bluetooth" in nav);
  }

  public async connect(): Promise<void> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new UnsupportedTransportError(this.type);
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.connect === "function"
      ) {
        await this.options.device.connect();
      }
      this.connected = true;
    } catch (error: any) {
      throw new LedgerTransportError(
        `WebBluetooth connection failed: ${error.message}`,
        "BLE_CONNECTION_FAILED"
      );
    }
  }

  public async close(): Promise<void> {
    if (
      this.options.device &&
      typeof this.options.device.disconnect === "function"
    ) {
      await this.options.device.disconnect();
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async getPublicKey(derivationPath: string): Promise<string> {
    if (!this.connected && !this.options.device) {
      await this.connect();
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.getPublicKey === "function"
      ) {
        return await this.options.device.getPublicKey(derivationPath);
      }
      throw new DeviceNotConnectedError(
        "WebBluetooth Ledger device not found or pairing rejected"
      );
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new LedgerTransportError(
        `WebBluetooth failed to retrieve public key: ${error.message}`,
        "BLE_GET_PUBLIC_KEY_FAILED"
      );
    }
  }

  public async signTransaction(
    derivationPath: string,
    txSignatureBase: Buffer | Uint8Array
  ): Promise<Buffer | Uint8Array> {
    if (!this.connected && !this.options.device) {
      await this.connect();
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.signTransaction === "function"
      ) {
        return await this.options.device.signTransaction(
          derivationPath,
          txSignatureBase
        );
      }
      throw new DeviceNotConnectedError(
        "WebBluetooth Ledger device not found or pairing rejected"
      );
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new LedgerTransportError(
        `WebBluetooth failed to sign transaction: ${error.message}`,
        "BLE_SIGN_TRANSACTION_FAILED"
      );
    }
  }
}

/**
 * Concrete WebHID transport implementation for Ledger devices.
 * Uses WebHID API for desktop browser hardware wallet communication.
 */
export class WebHidTransport implements LedgerTransport {
  public readonly type: LedgerTransportType = "webhid";
  private connected: boolean = false;
  private options: WebHidTransportOptions;

  constructor(options?: WebHidTransportOptions) {
    this.options = options || {};
  }

  public async isSupported(): Promise<boolean> {
    if (this.options.device) {
      return true;
    }
    const nav = getGlobalNavigator();
    return Boolean(nav && "hid" in nav);
  }

  public async connect(): Promise<void> {
    const supported = await this.isSupported();
    if (!supported) {
      throw new UnsupportedTransportError(this.type);
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.open === "function"
      ) {
        await this.options.device.open();
      }
      this.connected = true;
    } catch (error: any) {
      throw new LedgerTransportError(
        `WebHID connection failed: ${error.message}`,
        "HID_CONNECTION_FAILED"
      );
    }
  }

  public async close(): Promise<void> {
    if (
      this.options.device &&
      typeof this.options.device.close === "function"
    ) {
      await this.options.device.close();
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async getPublicKey(derivationPath: string): Promise<string> {
    if (!this.connected && !this.options.device) {
      await this.connect();
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.getPublicKey === "function"
      ) {
        return await this.options.device.getPublicKey(derivationPath);
      }
      throw new DeviceNotConnectedError("WebHID Ledger device not found");
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new LedgerTransportError(
        `WebHID failed to retrieve public key: ${error.message}`,
        "HID_GET_PUBLIC_KEY_FAILED"
      );
    }
  }

  public async signTransaction(
    derivationPath: string,
    txSignatureBase: Buffer | Uint8Array
  ): Promise<Buffer | Uint8Array> {
    if (!this.connected && !this.options.device) {
      await this.connect();
    }
    try {
      if (
        this.options.device &&
        typeof this.options.device.signTransaction === "function"
      ) {
        return await this.options.device.signTransaction(
          derivationPath,
          txSignatureBase
        );
      }
      throw new DeviceNotConnectedError("WebHID Ledger device not found");
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new LedgerTransportError(
        `WebHID failed to sign transaction: ${error.message}`,
        "HID_SIGN_TRANSACTION_FAILED"
      );
    }
  }
}

/**
 * Factory class for creating configured Ledger hardware wallet transport providers.
 */
export class LedgerTransportFactory {
  public static create(
    type: LedgerTransportType,
    options?: any
  ): LedgerTransport {
    switch (type) {
      case "webusb":
        return new WebUsbTransport(options);
      case "webble":
        return new WebBleTransport(options);
      case "webhid":
        return new WebHidTransport(options);
      default:
        throw new UnsupportedTransportError(type);
    }
  }

  public static createWebUsb(
    options?: WebUsbTransportOptions
  ): WebUsbTransport {
    return new WebUsbTransport(options);
  }

  public static createWebBle(
    options?: WebBleTransportOptions
  ): WebBleTransport {
    return new WebBleTransport(options);
  }

  public static createWebHid(
    options?: WebHidTransportOptions
  ): WebHidTransport {
    return new WebHidTransport(options);
  }
}

/**
 * Ledger hardware wallet signer supporting multiple transport providers
 * (WebUSB, WebBluetooth, WebHID, and custom transports).
 */
export class LedgerSigner {
  private derivationPath: string;
  private defaultTransport?: LedgerTransport | any;

  constructor(options?: LedgerSignerOptions) {
    this.derivationPath = options?.derivationPath || "m/44'/148'/0'";
    if (options?.transport) {
      this.defaultTransport = options.transport;
    } else if (options?.transportType) {
      this.defaultTransport = LedgerTransportFactory.create(
        options.transportType
      );
    }
  }

  /**
   * Sets or updates the active transport provider.
   */
  public setTransport(transport: LedgerTransport | any): void {
    this.defaultTransport = transport;
  }

  /**
   * Retrieves the currently configured default transport provider.
   */
  public getTransport(): LedgerTransport | any {
    return this.defaultTransport;
  }

  /**
   * Retrieves the derivation path configured for this signer.
   */
  public getDerivationPath(): string {
    return this.derivationPath;
  }

  /**
   * Retrieves the Stellar public key from the connected Ledger hardware wallet.
   * Accepts an explicit transport provider or falls back to the configured default.
   */
  public async getPublicKey(transport?: any): Promise<string> {
    const activeTransport = transport || this.defaultTransport;
    try {
      if (
        activeTransport &&
        typeof activeTransport.getPublicKey === "function"
      ) {
        return await activeTransport.getPublicKey(this.derivationPath);
      }
      throw new Error("Invalid Ledger Transport provider");
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new Error(`Ledger connection failed: ${error.message}`);
    }
  }

  /**
   * Signs a Stellar Transaction using the connected Ledger device.
   * Accepts an explicit transport provider or falls back to the configured default.
   */
  public async signTransaction(
    tx: Transaction,
    transport?: any
  ): Promise<Transaction> {
    const activeTransport = transport || this.defaultTransport;
    try {
      const txSignatureBase = tx.signatureBase();

      if (
        activeTransport &&
        typeof activeTransport.signTransaction === "function"
      ) {
        const signature = await activeTransport.signTransaction(
          this.derivationPath,
          txSignatureBase
        );
        const pubKey = await this.getPublicKey(activeTransport);
        const signatureStr =
          typeof signature === "string"
            ? signature
            : Buffer.isBuffer(signature)
            ? signature.toString("base64")
            : Buffer.from(signature).toString("base64");
        tx.addSignature(pubKey, signatureStr);
        return tx;
      }
      throw new Error("Invalid Ledger Transport provider");
    } catch (error: any) {
      if (error instanceof LedgerTransportError) {
        throw error;
      }
      throw new Error(`Ledger transaction signing failed: ${error.message}`);
    }
  }
}
