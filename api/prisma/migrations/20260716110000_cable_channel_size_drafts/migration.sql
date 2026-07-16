-- Load the unique white cable-channel sizes found in the referenced IEK catalog.
-- Unknown local commercial data is intentionally not fabricated: these rows stay
-- inactive with zero stock and price until an administrator fills and activates them.
WITH drafts("key", "size", "typeKg", "typeRu", "sortOrder") AS (
  VALUES
    ('10x7', '10x7 мм', 'магистралдык', 'магистральный', 2),
    ('12x12', '12x12 мм', 'магистралдык', 'магистральный', 3),
    ('15x10', '15x10 мм', 'магистралдык', 'магистральный', 4),
    ('20x10', '20x10 мм', 'магистралдык', 'магистральный', 5),
    ('24x14', '24x14 мм', 'магистралдык', 'магистральный', 6),
    ('25x25', '25x25 мм', 'магистралдык', 'магистральный', 7),
    ('30x25', '30x25 мм', 'магистралдык', 'магистральный', 8),
    ('40x16', '40x16 мм', 'магистралдык', 'магистральный', 9),
    ('40-2x16', '40/2x16 мм', 'эки секциялуу', 'двухсекционный', 10),
    ('40x16-divider', '40x16 мм', 'бөлгүчтүү', 'с разделителем', 11),
    ('40x25', '40x25 мм', 'магистралдык', 'магистральный', 12),
    ('40x40', '40x40 мм', 'магистралдык', 'магистральный', 13),
    ('60x40', '60x40 мм', 'магистралдык', 'магистральный', 14),
    ('60x60', '60x60 мм', 'магистралдык', 'магистральный', 15),
    ('80x40', '80x40 мм', 'магистралдык', 'магистральный', 16),
    ('80x60', '80x60 мм', 'магистралдык', 'магистральный', 17),
    ('100x40', '100x40 мм', 'магистралдык', 'магистральный', 18),
    ('100x60', '100x60 мм', 'магистралдык', 'магистральный', 19),
    ('150x60', '150x60 мм', 'магистралдык', 'магистральный', 20),
    ('20x12-5-skirting', '20x12,5 мм', 'плинтустук, бир секциялуу', 'плинтусный, односекционный', 21),
    ('40x20-skirting', '40x20 мм', 'плинтустук, бир секциялуу', 'плинтусный, односекционный', 22),
    ('60x16-skirting-3', '60x16 мм', 'плинтустук, үч секциялуу', 'плинтусный, трехсекционный', 23),
    ('75x20-skirting-3', '75x20 мм', 'плинтустук, үч секциялуу', 'плинтусный, трехсекционный', 24),
    ('80x20-skirting', '80x20 мм', 'плинтустук', 'плинтусный', 25),
    ('80x35-parapet', '80x35 мм', 'парапеттик, капкаксыз', 'парапетный, без крышки', 26),
    ('100x50-parapet', '100x50 мм', 'парапеттик, капкагы менен', 'парапетный, с крышкой', 27),
    ('150x65-parapet', '150x65 мм', 'парапеттик, капкаксыз', 'парапетный, без крышки', 28)
)
INSERT INTO "ProductVariant" (
  "id",
  "productId",
  "titleKg",
  "titleRu",
  "sku",
  "price",
  "currency",
  "unit",
  "stockQuantity",
  "reservedQuantity",
  "stockStatus",
  "isActive",
  "sortOrder",
  "specs",
  "createdAt",
  "updatedAt"
)
SELECT
  'cable-channel-white-2m-draft-' || drafts."key",
  'cable-channel-25x16',
  drafts."size" || ', 2 м, ак — ' || drafts."typeKg",
  drafts."size" || ', 2 м, белый — ' || drafts."typeRu",
  NULL,
  0.00,
  'KGS',
  'даана',
  0,
  0,
  'OUT_OF_STOCK'::"ProductStockStatus",
  false,
  drafts."sortOrder",
  jsonb_build_object(
    'Размер', drafts."size",
    'Длина', '2 м',
    'Цвет', 'белый',
    'Тип', drafts."typeRu"
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM drafts
WHERE EXISTS (
  SELECT 1 FROM "Product" WHERE "id" = 'cable-channel-25x16'
)
ON CONFLICT ("id") DO NOTHING;
