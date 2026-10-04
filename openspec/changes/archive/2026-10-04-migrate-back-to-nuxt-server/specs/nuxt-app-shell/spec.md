## REMOVED Requirements

### Requirement: Proxy de l'API
**Reason**: L'API est désormais hébergée par le serveur Nitro lui-même (`front/server/api/**`) ; il n'y a plus de back distant à proxifier.
**Migration**: Supprimer `front/server/api/[...path].ts` et la variable `API_URL` ; le front continue d'appeler `/api/**` en chemin relatif, désormais servi par les handlers Nitro (voir capability `api-server-foundation`).
