-- Publish every verified white cable-channel body as a regular product variant.
-- Local prices and physical stock for the added sizes are still unknown, so the
-- variants remain honestly OUT_OF_STOCK until an administrator enters those values.
UPDATE "ProductVariant"
SET
  "sku" = COALESCE(
    "sku",
    'SR-ELC-CHN-' || UPPER(SUBSTRING("id" FROM 'draft-(.+)$')) || '-2M'
  ),
  "isActive" = true,
  "stockStatus" = 'OUT_OF_STOCK'::"ProductStockStatus",
  "stockQuantity" = 0,
  "reservedQuantity" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "productId" = 'cable-channel-25x16'
  AND "id" LIKE 'cable-channel-white-2m-draft-%';

-- Remove the temporary enquiry-only presentation. All these sizes are variants now.
UPDATE "Product"
SET
  "specs" = (COALESCE("specs", '{}'::jsonb) - 'Заказ өлчөмдөрү' - 'Буйрутма өлчөмдөрү')
    || jsonb_build_object('Өлчөмдөр', '29 типоразмер'),
  "specsRu" = (COALESCE("specsRu", '{}'::jsonb) - 'Размеры под заказ')
    || jsonb_build_object('Размеры', '29 типоразмеров'),
  "shortDescriptionKg" = 'Узундугу 2 м болгон ак ElectroSafe кабель-каналы 29 типоразмерде бар.',
  "shortDescriptionRu" = 'Белый кабель-канал ElectroSafe длиной 2 м представлен в 29 типоразмерах.',
  "descriptionKg" = 'ElectroSafe кабель-каналы — узундугу 2 м болгон ак түстөгү ачык монтаж каналы. Керектүү типоразмерди варианттардан тандаңыз.',
  "descriptionRu" = 'Белый кабель-канал ElectroSafe длиной 2 м предназначен для открытой прокладки кабелей. Каждый из 29 типоразмеров показан как обычный вариант с отдельными SKU и складским статусом; цена появится после заполнения в админке.',
  "seoTitleKg" = 'ElectroSafe кабель-каналы, 2 м, 29 типоразмер - StroyRayon',
  "seoDescriptionKg" = '2 метрлик ак ElectroSafe кабель-каналы: 29 типоразмер, ар биринде өзүнчө SKU жана кампа статусу.',
  "seoTitleRu" = 'Кабель-канал ElectroSafe, 2 м, 29 типоразмеров - StroyRayon',
  "seoDescriptionRu" = 'Белый кабель-канал ElectroSafe длиной 2 м: 29 типоразмеров с отдельными SKU и складскими статусами.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cable-channel-25x16';
