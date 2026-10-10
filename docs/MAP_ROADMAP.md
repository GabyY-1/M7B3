# M7B3 Maps — architecture V0.2

## Livré

- React / Vite, interface française responsive.
- Moteur satellite procédural déterministe, sans fonds de carte de la Terre.
- Tuiles de 256 px, découpées par niveau de zoom entier et agrandies aux niveaux fractionnaires.
- Génération à la demande des tuiles visibles, avec cache LRU de 110 tuiles.
- Niveaux de zoom 0 à 19 (résolution d'affichage théorique seulement).
- Équivalence longitude/latitude dans une projection équirectangulaire.
- Calibration approximative du niveau marin sur une grille sphérique pondérée par cos(latitude).
- Commandes de navigation et recherche des continents par code.
- Données de référence : `public/data/planet.json`.
- Compilation surveillée par GitHub Actions.

## Limites importantes

- Carte satellite **fictive et procédurale**, pas une prise de vue réelle.
- Les continents et océans ne correspondent pas encore à des polygones mesurés de C1 à C5 / O1 à O6.
- Le réglage du niveau marin est approximatif, il ne garantit pas exactement 70 % des océans, et les masses par continent restent des cibles non vérifiées.
- Les tuiles raffinées contiennent une texture supplémentaire à haut zoom, **pas** de vrais détails à l'échelle des bâtiments.
- L'affichage devient plus fin aux niveaux de zoom élevés, mais sa précision géographique effective reste limitée.
- La génération s'effectue dans le navigateur et peut prendre du temps sur les appareils modestes.
- Aucun serveur géospatial, tuilage précalculé, mesure topographique certifiée, réseau hydrographique ou bâtiments à ce stade.

## À faire pour atteindre une précision comparable à Google Maps

1. Stabiliser les données géographiques de référence et contrôler leurs surfaces sur la sphère.
2. Générer un raster d'altitude et de bathymétrie, puis des tuiles de DEM multi-résolution.
3. Déduire les réseaux fluviaux physiquement cohérents du DEM.
4. Séparer les couches raster et vectorielles (routes, régions, bâtiments).
5. Calculer ou préconstruire les tuiles avec Python et servir des niveaux de détail adaptés.
6. Ajouter l'exploration locale et la recherche spatiale.
7. Créer le mode Plan au moment de la création des pays.

Note : Le mode Plan prendra la priorité lorsque les pays auront été définis.
