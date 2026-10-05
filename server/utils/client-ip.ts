import { getRequestHeader, getRequestIP, type H3Event } from 'h3'

// En-tête posé par le reverse proxy de confiance (proxy inversé Synology DSM : `X-Real-IP $remote_addr`).
// `X-Forwarded-For` n'est jamais lu : sa première valeur est fournie par le client.
export const TRUSTED_IP_HEADER = 'x-real-ip'

// IP du client : en-tête du proxy de confiance, sinon adresse de la socket.
export const getTrustedIp = (event: H3Event): string =>
  getRequestHeader(event, TRUSTED_IP_HEADER) || getRequestIP(event) || ''
