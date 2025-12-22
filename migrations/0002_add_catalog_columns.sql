-- Add missing catalog columns for older databases that only had id/nom.
ALTER TABLE catalog_produits ADD COLUMN reference TEXT;
ALTER TABLE catalog_produits ADD COLUMN designation TEXT;
ALTER TABLE catalog_produits ADD COLUMN mandrin TEXT;
ALTER TABLE catalog_produits ADD COLUMN etiquettes_par_rouleau INTEGER;
ALTER TABLE catalog_produits ADD COLUMN rouleaux_par_carton INTEGER;
ALTER TABLE catalog_produits ADD COLUMN description TEXT;
