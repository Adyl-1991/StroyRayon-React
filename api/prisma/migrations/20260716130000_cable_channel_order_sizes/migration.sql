-- Surface inactive size drafts as enquiry-only sizes on the storefront.
-- They remain non-purchasable until a local price and stock are entered.
UPDATE "Product"
SET
  "specs" = COALESCE("specs", '{}'::jsonb) || jsonb_build_object(
    'Заказ өлчөмдөрү',
    '10x7; 12x12; 15x10; 20x10; 24x14; 25x25; 30x25; 40x16; 40/2x16 эки секциялуу; 40x16 бөлгүчтүү; 40x25; 40x40; 60x40; 60x60; 80x40; 80x60; 100x40; 100x60; 150x60; 20x12,5 плинтустук; 40x20 плинтустук; 60x16 плинтустук; 75x20 плинтустук; 80x20 плинтустук; 80x35 парапеттик; 100x50 парапеттик; 150x65 парапеттик'
  ),
  "specsRu" = COALESCE("specsRu", '{}'::jsonb) || jsonb_build_object(
    'Размеры под заказ',
    '10x7; 12x12; 15x10; 20x10; 24x14; 25x25; 30x25; 40x16; 40/2x16 двухсекционный; 40x16 с разделителем; 40x25; 40x40; 60x40; 60x60; 80x40; 80x60; 100x40; 100x60; 150x60; 20x12,5 плинтусный; 40x20 плинтусный; 60x16 плинтусный; 75x20 плинтусный; 80x20 плинтусный; 80x35 парапетный; 100x50 парапетный; 150x65 парапетный'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cable-channel-25x16';
