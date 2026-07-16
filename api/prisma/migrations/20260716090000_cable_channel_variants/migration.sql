-- Consolidate the two live white 2 m cable-channel products into one
-- selectable product without duplicating inventory.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Product" WHERE "id" = 'cable-channel-25x16'
  ) OR NOT EXISTS (
    SELECT 1 FROM "Product" WHERE "id" = 'cable-channel-16x16'
  ) THEN
    RAISE EXCEPTION 'Cable-channel products required for variant migration are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Stock"
    WHERE "productId" IN ('cable-channel-16x16', 'cable-channel-25x16')
      AND "reservedQuantity" > 0
  ) THEN
    RAISE EXCEPTION 'Cannot consolidate cable-channel stock while reservations exist';
  END IF;
END
$$;

UPDATE "Product"
SET
  "titleKg" = 'ElectroSafe кабель-каналы, 2 м, ак',
  "titleRu" = 'Кабель-канал ElectroSafe, 2 м, белый',
  "slug" = 'kabel-kanal-25x16-2',
  "sku" = 'SR-ELC-CHN-WHT-2M',
  "price" = 38.00,
  "unit" = 'даана',
  "unitRu" = 'шт.',
  "minOrder" = '1 даана',
  "minOrderRu" = '1 шт.',
  "packageInfoKg" = '1 даана (узундугу 2 м)',
  "packageInfoRu" = '1 шт. (длина 2 м)',
  "shortDescriptionKg" = 'Узундугу 2 м болгон ак ElectroSafe кабель-каналы 16x16 жана 25x16 өлчөмдөрүндө бар.',
  "shortDescriptionRu" = 'Белый кабель-канал ElectroSafe длиной 2 м доступен в размерах 16x16 и 25x16 мм.',
  "descriptionKg" = 'ElectroSafe кабель-каналы — узундугу 2 м болгон ак түстөгү ачык монтаж каналы. 16x16 жана 25x16 мм өлчөмдөрүнүн бирин тандап, интернет, сигналдык жана айрым электр линияларын офис, дүкөн, коридор же ремонттон кийинки көрүнгөн трассада тыкан өткөрүүгө болот. Өлчөмдү тандоодо кабель саны, диаметри, бурулуштар жана келечектеги запас эске алынат.',
  "descriptionRu" = 'Белый кабель-канал ElectroSafe длиной 2 м предназначен для открытой прокладки кабелей. Доступны размеры 16x16 и 25x16 мм с отдельными ценами и остатками. Кабель-канал подходит для интернет-, сигнальных и отдельных электрических линий в офисах, магазинах, коридорах и при монтаже после ремонта.',
  "specs" = jsonb_build_object(
    'Бренд', 'ElectroSafe',
    'Өлчөмдөр', '16x16 жана 25x16 мм',
    'Узундугу', '2 м',
    'Материал / корпус', 'Пластик канал, партия боюнча такталат',
    'Түсү', 'ак',
    'Сатуу бирдиги', 'даана',
    'Минималдуу заказ', '1 даана'
  ),
  "specsRu" = jsonb_build_object(
    'Бренд', 'ElectroSafe',
    'Размеры', '16x16 и 25x16 мм',
    'Длина', '2 м',
    'Материал / корпус', 'Пластиковый канал, уточняется по партии',
    'Цвет', 'белый',
    'Единица продажи', 'шт.',
    'Минимальный заказ', '1 шт.'
  ),
  "seoTitleKg" = 'ElectroSafe кабель-каналы, 2 м, 16x16 жана 25x16 - StroyRayon',
  "seoDescriptionKg" = '2 метрлик ак ElectroSafe кабель-каналы: 16x16 жана 25x16 мм. Өлчөмдү, бааны жана наличиени тандаңыз.',
  "seoTitleRu" = 'Кабель-канал ElectroSafe, 2 м, 16x16 и 25x16 - StroyRayon',
  "seoDescriptionRu" = 'Белый кабель-канал ElectroSafe длиной 2 м: размеры 16x16 и 25x16 мм с отдельными ценами и остатками.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cable-channel-25x16';

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
VALUES
  (
    'cable-channel-white-2m-16x16',
    'cable-channel-25x16',
    '16x16 мм, 2 м, ак',
    '16x16 мм, 2 м, белый',
    'SR-ELC-CHN-1616-2M',
    38.00,
    'KGS',
    'даана',
    COALESCE((SELECT "quantity" FROM "Stock" WHERE "productId" = 'cable-channel-16x16'), 0),
    0,
    COALESCE((SELECT "stockStatus" FROM "Product" WHERE "id" = 'cable-channel-16x16'), 'IN_STOCK'::"ProductStockStatus"),
    true,
    0,
    jsonb_build_object('Размер', '16x16 мм', 'Длина', '2 м', 'Цвет', 'белый'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'cable-channel-white-2m-25x16',
    'cable-channel-25x16',
    '25x16 мм, 2 м, ак',
    '25x16 мм, 2 м, белый',
    'SR-ELC-CHN-2516-2M',
    59.97,
    'KGS',
    'даана',
    COALESCE((SELECT "quantity" FROM "Stock" WHERE "productId" = 'cable-channel-25x16'), 0),
    0,
    COALESCE((SELECT "stockStatus" FROM "Product" WHERE "id" = 'cable-channel-25x16'), 'IN_STOCK'::"ProductStockStatus"),
    true,
    1,
    jsonb_build_object('Размер', '25x16 мм', 'Длина', '2 м', 'Цвет', 'белый'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE
SET
  "productId" = EXCLUDED."productId",
  "titleKg" = EXCLUDED."titleKg",
  "titleRu" = EXCLUDED."titleRu",
  "sku" = EXCLUDED."sku",
  "price" = EXCLUDED."price",
  "currency" = EXCLUDED."currency",
  "unit" = EXCLUDED."unit",
  "stockQuantity" = EXCLUDED."stockQuantity",
  "stockStatus" = EXCLUDED."stockStatus",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "specs" = EXCLUDED."specs",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Product"
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cable-channel-16x16';
