## Context

Change rédigé après coup pour une fonctionnalité déjà livrée (`492236b`, `c4ccdc9`). Il consigne les choix faits pendant l'implémentation.

## Decisions

### D1. Plafond indicatif, sans contrôle
Le plafond ne bloque aucune opération et n'entre dans aucun solde : un versement peut le dépasser (intérêts capitalisés, erreur de saisie à corriger). La jauge le signale, au-delà de 100 %.

### D2. Conservé par un `PUT` qui l'omet
Une PWA restée en cache envoie un `PUT` complet sans `Plafond`. Le champ est déclaré dans `preserve` de `compteResource` pour ne pas l'effacer ; un `null` explicite l'efface.

### D3. Solde total
La jauge utilise le solde total du compte (pointé et non pointé), qui est celui qui compte pour le plafond une fois les opérations passées.

### D4. Plafond lu dans la liste des comptes
`AccountHeader` lit le plafond dans la liste des comptes du store, mise à jour dès l'enregistrement du formulaire, plutôt que dans `activeAccount`, qui n'est rechargé qu'au changement de compte.
