#!/usr/bin/env node
// Produit le hash bcrypt (coût 12) d'un code de connexion, à coller tel quel dans `User.secret_key` (phpMyAdmin).
//   pnpm hash-code 123456
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'

export const CODE_LENGTH = 6
export const BCRYPT_COST = 12

export const hashCode = (code) => {
  if (typeof code !== 'string' || code.length !== CODE_LENGTH) {
    throw new Error(`Le code doit faire exactement ${CODE_LENGTH} caractères.`)
  }
  return bcrypt.hash(code, BCRYPT_COST)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(await hashCode(process.argv[2]))
  } catch (error) {
    console.error(error.message)
    console.error('Usage : pnpm hash-code <code>')
    process.exit(1)
  }
}
