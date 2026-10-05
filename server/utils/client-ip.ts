import { isIPv6 } from 'node:net'
import { getRequestHeader, getRequestIP, type H3Event } from 'h3'

// En-tête posé par le reverse proxy de confiance. Chaîne : client → Cloudflare → proxy inversé Synology DSM → conteneur ;
// DSM recopie dans X-Real-IP l'IP client fournie par Cloudflare (`X-Real-IP $http_cf_connecting_ip`), voir docs/exploitation.md.
// `X-Forwarded-For` n'est jamais lu : sa première valeur est fournie par le client.
export const TRUSTED_IP_HEADER = 'x-real-ip'

declare module 'h3' {
  interface H3EventContext {
    /** IP complète du client (journal), avant réduction en clé de rate-limit */
    clientIp?: string
  }
}

// Développe une IPv6 en 8 groupes hexadécimaux (gère `::` et une IPv4 finale).
const expandIPv6 = (ip: string): string[] => {
  let address = ip
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(address)?.[1]
  if (v4) {
    const [a, b, c, d] = v4.split('.').map(Number) as [number, number, number, number]
    address = address.slice(0, -v4.length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const [head = '', tail] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const middle = tail === undefined ? [] : Array(8 - left.length - right.length).fill('0')
  return [...left, ...middle, ...right].map(group => group.toLowerCase().replace(/^0+(?=.)/, ''))
}

// Clé du rate-limit : une IPv4 telle quelle, une IPv6 réduite à son préfixe /64. Un fournisseur d'accès attribue à
// chaque client au moins un /64 (un /56 chez Orange) : compter par adresse exacte laisserait un attaquant changer
// d'adresse à chaque tentative. Les IPv4 mappées (::ffff:a.b.c.d) redeviennent des IPv4.
export const rateLimitKey = (raw: string): string => {
  const ip = raw.trim().replace(/%.*$/, '')
  if (!isIPv6(ip)) return ip
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1]
  if (mapped) return mapped
  return `${expandIPv6(ip).slice(0, 4).join(':')}::/64`
}

// IP complète du client (pour le journal) : posée par server/plugins/client-ip.ts, sinon en-tête ou socket.
export const getTrustedIp = (event: H3Event): string =>
  event.context.clientIp || getRequestHeader(event, TRUSTED_IP_HEADER) || getRequestIP(event) || ''
