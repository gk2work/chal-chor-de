const crypto = require("crypto");

/**
 * Encryption Service
 * Provides data encryption at rest and in transit
 */

class EncryptionService {
  constructor(masterKey) {
    // Master key should be stored in secure key management service (AWS KMS, Azure Key Vault)
    this.masterKey = masterKey || process.env.ENCRYPTION_MASTER_KEY;
    this.algorithm = "aes-256-gcm";
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext, additionalData = "") {
    try {
      // Generate random IV and salt
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);

      // Derive encryption key from master key and salt
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        salt,
        100000,
        this.keyLength,
        "sha512"
      );

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Set additional authenticated data (AAD)
      if (additionalData) {
        cipher.setAAD(Buffer.from(additionalData, "utf8"));
      }

      // Encrypt the data
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine all components
      const result = {
        encrypted: encrypted,
        iv: iv.toString("hex"),
        salt: salt.toString("hex"),
        tag: tag.toString("hex"),
        algorithm: this.algorithm,
      };

      return JSON.stringify(result);
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(encryptedData, additionalData = "") {
    try {
      const data = JSON.parse(encryptedData);

      // Convert hex strings back to buffers
      const iv = Buffer.from(data.iv, "hex");
      const salt = Buffer.from(data.salt, "hex");
      const tag = Buffer.from(data.tag, "hex");

      // Derive decryption key
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        salt,
        100000,
        this.keyLength,
        "sha512"
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      // Set authentication tag
      decipher.setAuthTag(tag);

      // Set additional authenticated data (AAD)
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData, "utf8"));
      }

      // Decrypt the data
      let decrypted = decipher.update(data.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data, salt = null) {
    const useSalt = salt || crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(data, useSalt, 100000, 64, "sha512");

    return {
      hash: hash.toString("hex"),
      salt: useSalt.toString("hex"),
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hashedData, salt) {
    const saltBuffer = Buffer.from(salt, "hex");
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, "sha512");

    return hash.toString("hex") === hashedData;
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Encrypt field-level data for database storage
   */
  encryptField(fieldValue, fieldName) {
    if (!fieldValue) return null;

    // Use field name as additional authenticated data
    return this.encrypt(
      typeof fieldValue === "string" ? fieldValue : JSON.stringify(fieldValue),
      fieldName
    );
  }

  /**
   * Decrypt field-level data from database
   */
  decryptField(encryptedValue, fieldName) {
    if (!encryptedValue) return null;

    try {
      const decrypted = this.decrypt(encryptedValue, fieldName);

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error(`Failed to decrypt field ${fieldName}:`, error);
      return null;
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  encryptObject(obj, fieldsToEncrypt = []) {
    const encrypted = { ...obj };

    fieldsToEncrypt.forEach((field) => {
      if (encrypted[field] !== undefined) {
        encrypted[field] = this.encryptField(encrypted[field], field);
      }
    });

    return encrypted;
  }

  /**
   * Decrypt multiple fields in an object
   */
  decryptObject(obj, fieldsToDecrypt = []) {
    const decrypted = { ...obj };

    fieldsToDecrypt.forEach((field) => {
      if (decrypted[field] !== undefined) {
        decrypted[field] = this.decryptField(decrypted[field], field);
      }
    });

    return decrypted;
  }

  /**
   * Generate data encryption key (DEK) for envelope encryption
   */
  generateDataKey() {
    const dek = crypto.randomBytes(this.keyLength);
    const encryptedDek = this.encrypt(dek.toString("hex"), "DEK");

    return {
      plaintext: dek,
      encrypted: encryptedDek,
    };
  }

  /**
   * Encrypt data using envelope encryption
   */
  envelopeEncrypt(plaintext) {
    // Generate a data encryption key
    const { plaintext: dek, encrypted: encryptedDek } = this.generateDataKey();

    // Encrypt data with DEK
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, dek, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    return {
      encrypted_data: encrypted,
      encrypted_key: encryptedDek,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    };
  }

  /**
   * Decrypt data using envelope encryption
   */
  envelopeDecrypt(envelopeData) {
    // Decrypt the data encryption key
    const dek = Buffer.from(
      this.decrypt(envelopeData.encrypted_key, "DEK"),
      "hex"
    );

    // Decrypt the data
    const iv = Buffer.from(envelopeData.iv, "hex");
    const tag = Buffer.from(envelopeData.tag, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, dek, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(envelopeData.encrypted_data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data, fieldsToMask = []) {
    const masked = { ...data };

    fieldsToMask.forEach((field) => {
      if (masked[field]) {
        const value = String(masked[field]);
        if (value.length <= 4) {
          masked[field] = "****";
        } else {
          // Show first and last 2 characters
          masked[field] =
            value.substring(0, 2) + "****" + value.substring(value.length - 2);
        }
      }
    });

    return masked;
  }
}

module.exports = EncryptionService;
