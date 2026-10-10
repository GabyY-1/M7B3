# M7B3 Maps — feuille de route

## En place

- Application React/Vite et interface en français.
- Première texture de terrain procédurale, déterministe et navigable.
- Zoom, glisser-déposer, coordonnées, codes continents, grille, panneau de calques.
- Référentiel planétaire dans `public/data/planet.json`.

## Limites actuelles

- La texture **n'est pas** une image satellite observée : M7B3 est fictive.
- Les contours affichés ne sont pas les polygones géodésiques définitifs de C1–C5.
- L'objectif de 70 % d'océans est approché sur une grille d'image, pas encore mesuré par surface sphérique.
- Les bascules « océans », « relief », « îles » et « pôles » sont conservées dans l'interface mais ne correspondent pas encore à des couches de rendu indépendantes.
- L'hydrographie est explicitement désactivée tant que les fleuves n'ont pas été calculés.

## Étapes suivantes

1. Construire des masques continentaux à aire **sphérique** contrôlée et des îles indépendantes.
2. Raffiner les côtes, fjords, baies, détroits et mers.
3. Créer une grille d'altitudes terrestre et bathymétrique reproductible.
4. Déduire les fleuves et les lacs du modèle de relief.
5. Générer des tuiles multi-résolution pour des zooms réellement détaillés.
6. Ajouter le mode Plan quand pays, villes et réseaux seront définis.
7. Envisager un globe 3D avec le même référentiel M7B3.

Les cartes et leurs données seront maintenues directement dans ce dépôt.
