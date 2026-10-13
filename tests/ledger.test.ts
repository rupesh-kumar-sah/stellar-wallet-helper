import {
  LedgerSigner,
  WebUsbTransport,
  WebBleTransport,
  WebHidTransport,
  LedgerTransportFactory,
  LedgerTransportError,
  DeviceNotConnectedError,
  UnsupportedTransportError,
} from "../src/ledger";
import { Keypair } from "@stellar/stellar-sdk";

describe("Ledger Hardware Wallet Transport Providers", () => {
  const testKeypair = Keypair.random();
  const testPublicKey = testKeypair.publicKey();
  const testDerivationPath = "m/44'/148'/0'";
  const testSignature = Buffer.from("mock-stellar-signature-bytes");

  describe("WebUsbTransport", () => {
    it("should have type webusb", () => {
      const transport = new WebUsbTransport();
      expect(transport.type).toBe("webusb");
      expect(transport.isConnected()).toBe(false);
    });

    it("should return false for isSupported when navigator.usb is undefined in Node", async () => {
      const transport = new WebUsbTransport();
      const supported = await transport.isSupported();
      expect(supported).toBe(false);
    });

    it("should throw UnsupportedTransportError on connect when unsupported", async () => {
      const transport = new WebUsbTransport();
      await expect(transport.connect()).rejects.toThrow(
        UnsupportedTransportError
      );
    });

    it("should connect and operate successfully with custom mock device", async () => {
      const mockDevice = {
        open: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        signTransaction: jest.fn().mockResolvedValue(testSignature),
      };

      const transport = new WebUsbTransport({ device: mockDevice });
      expect(await transport.isSupported()).toBe(true);

      await transport.connect();
      expect(transport.isConnected()).toBe(true);
      expect(mockDevice.open).toHaveBeenCalled();

      const pubKey = await transport.getPublicKey(testDerivationPath);
      expect(pubKey).toBe(testPublicKey);
      expect(mockDevice.getPublicKey).toHaveBeenCalledWith(testDerivationPath);

      const sig = await transport.signTransaction(
        testDerivationPath,
        Buffer.from("tx-payload")
      );
      expect(sig).toEqual(testSignature);
      expect(mockDevice.signTransaction).toHaveBeenCalledWith(
        testDerivationPath,
        expect.any(Buffer)
      );

      await transport.close();
      expect(transport.isConnected()).toBe(false);
      expect(mockDevice.close).toHaveBeenCalled();
    });

    it("should throw DeviceNotConnectedError if mock device lacks getPublicKey", async () => {
      const mockDevice = {
        open: jest.fn().mockResolvedValue(undefined),
      };
      const transport = new WebUsbTransport({ device: mockDevice });
      await expect(transport.getPublicKey(testDerivationPath)).rejects.toThrow(
        DeviceNotConnectedError
      );
    });
  });

  describe("WebBleTransport", () => {
    it("should have type webble", () => {
      const transport = new WebBleTransport();
      expect(transport.type).toBe("webble");
      expect(transport.isConnected()).toBe(false);
    });

    it("should return false for isSupported when navigator.bluetooth is undefined in Node", async () => {
      const transport = new WebBleTransport();
      const supported = await transport.isSupported();
      expect(supported).toBe(false);
    });

    it("should throw UnsupportedTransportError on connect when unsupported", async () => {
      const transport = new WebBleTransport();
      await expect(transport.connect()).rejects.toThrow(
        UnsupportedTransportError
      );
    });

    it("should connect and operate successfully with custom mock BLE device", async () => {
      const mockDevice = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        signTransaction: jest.fn().mockResolvedValue(testSignature),
      };

      const transport = new WebBleTransport({ device: mockDevice });
      expect(await transport.isSupported()).toBe(true);

      await transport.connect();
      expect(transport.isConnected()).toBe(true);
      expect(mockDevice.connect).toHaveBeenCalled();

      const pubKey = await transport.getPublicKey(testDerivationPath);
      expect(pubKey).toBe(testPublicKey);

      const sig = await transport.signTransaction(
        testDerivationPath,
        Buffer.from("ble-payload")
      );
      expect(sig).toEqual(testSignature);

      await transport.close();
      expect(transport.isConnected()).toBe(false);
      expect(mockDevice.disconnect).toHaveBeenCalled();
    });
  });

  describe("WebHidTransport", () => {
    it("should have type webhid", () => {
      const transport = new WebHidTransport();
      expect(transport.type).toBe("webhid");
    });

    it("should operate with mock HID device", async () => {
      const mockDevice = {
        open: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        signTransaction: jest.fn().mockResolvedValue(testSignature),
      };

      const transport = new WebHidTransport({ device: mockDevice });
      await transport.connect();
      expect(await transport.getPublicKey(testDerivationPath)).toBe(
        testPublicKey
      );
      expect(
        await transport.signTransaction(
          testDerivationPath,
          Buffer.from("hid-payload")
        )
      ).toEqual(testSignature);
      await transport.close();
    });
  });

  describe("LedgerTransportFactory", () => {
    it("should create WebUsbTransport via factory", () => {
      const transport = LedgerTransportFactory.create("webusb");
      expect(transport).toBeInstanceOf(WebUsbTransport);
      expect(transport.type).toBe("webusb");
    });

    it("should create WebBleTransport via factory", () => {
      const transport = LedgerTransportFactory.create("webble");
      expect(transport).toBeInstanceOf(WebBleTransport);
      expect(transport.type).toBe("webble");
    });

    it("should create WebHidTransport via factory", () => {
      const transport = LedgerTransportFactory.create("webhid");
      expect(transport).toBeInstanceOf(WebHidTransport);
      expect(transport.type).toBe("webhid");
    });

    it("should throw on unsupported transport type", () => {
      expect(() => LedgerTransportFactory.create("invalid" as any)).toThrow(
        UnsupportedTransportError
      );
    });
  });

  describe("LedgerSigner integration with transports", () => {
    it("should initialize with default derivation path", () => {
      const signer = new LedgerSigner();
      expect(signer.getDerivationPath()).toBe("m/44'/148'/0'");
    });

    it("should allow custom derivation path and transport configuration", () => {
      const customPath = "m/44'/148'/2'";
      const transport = new WebUsbTransport();
      const signer = new LedgerSigner({
        derivationPath: customPath,
        transport,
      });
      expect(signer.getDerivationPath()).toBe(customPath);
      expect(signer.getTransport()).toBe(transport);
    });

    it("should update transport via setTransport", () => {
      const signer = new LedgerSigner();
      const bleTransport = new WebBleTransport();
      signer.setTransport(bleTransport);
      expect(signer.getTransport()).toBe(bleTransport);
    });

    it("should get public key using configured transport", async () => {
      const mockTransport = {
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
      };
      const signer = new LedgerSigner({ transport: mockTransport });
      const pubKey = await signer.getPublicKey();
      expect(pubKey).toBe(testPublicKey);
      expect(mockTransport.getPublicKey).toHaveBeenCalledWith("m/44'/148'/0'");
    });

    it("should get public key using explicitly passed transport", async () => {
      const signer = new LedgerSigner();
      const explicitTransport = {
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
      };
      const pubKey = await signer.getPublicKey(explicitTransport);
      expect(pubKey).toBe(testPublicKey);
      expect(explicitTransport.getPublicKey).toHaveBeenCalledWith(
        "m/44'/148'/0'"
      );
    });

    it("should throw error when no transport is provided or configured", async () => {
      const signer = new LedgerSigner();
      await expect(signer.getPublicKey()).rejects.toThrow(
        "Invalid Ledger Transport provider"
      );
    });

    it("should sign transaction with mock transaction object", async () => {
      const mockTx = {
        signatureBase: jest.fn().mockReturnValue(Buffer.from("tx-sig-base")),
        addSignature: jest.fn(),
      };
      const mockTransport = {
        getPublicKey: jest.fn().mockResolvedValue(testPublicKey),
        signTransaction: jest.fn().mockResolvedValue(testSignature),
      };

      const signer = new LedgerSigner({ transport: mockTransport });
      const result = await signer.signTransaction(mockTx as any);

      expect(mockTx.signatureBase).toHaveBeenCalled();
      expect(mockTransport.signTransaction).toHaveBeenCalledWith(
        "m/44'/148'/0'",
        expect.any(Buffer)
      );
      expect(mockTx.addSignature).toHaveBeenCalledWith(
        testPublicKey,
        testSignature.toString("base64")
      );
      expect(result).toBe(mockTx);
    });
  });
});
