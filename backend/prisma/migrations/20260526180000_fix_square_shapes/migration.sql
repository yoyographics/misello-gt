-- Fix products that should be SQUARE instead of RECTANGULAR
UPDATE "Product" SET "shape" = 'SQUARE' WHERE "sku" IN ('S-520', 'S-524', 'S-530', 'S-542', 'S-530D', 'S-542D');
