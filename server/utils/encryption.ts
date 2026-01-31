import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

function getKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32)
}

export function encrypt(text: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = getKey(secret, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine salt + iv + authTag + encrypted data
  return salt.toString('hex') + iv.toString('hex') + authTag.toString('hex') + encrypted
}

export function decrypt(encryptedData: string, secret: string): string {
  const salt = Buffer.from(encryptedData.slice(0, SALT_LENGTH * 2), 'hex')
  const iv = Buffer.from(encryptedData.slice(SALT_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2), 'hex')
  const authTag = Buffer.from(encryptedData.slice(SALT_LENGTH * 2 + IV_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2), 'hex')
  const encrypted = encryptedData.slice(SALT_LENGTH * 2 + IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2)

  const key = getKey(secret, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function encryptJson(data: unknown, secret: string): string {
  return encrypt(JSON.stringify(data), secret)
}

export function decryptJson<T>(encryptedData: string, secret: string): T {
  return JSON.parse(decrypt(encryptedData, secret))
}
