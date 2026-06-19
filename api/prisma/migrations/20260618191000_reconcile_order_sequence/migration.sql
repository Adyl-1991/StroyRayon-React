INSERT INTO "OrderSequence" ("year", "value", "updatedAt")
SELECT
  EXTRACT(YEAR FROM "createdAt")::INTEGER AS "year",
  MAX(RIGHT("orderNumber", 6)::INTEGER) AS "value",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM "Order"
WHERE "orderNumber" ~ '^SR-[0-9]{4}-[0-9]{6}$'
GROUP BY EXTRACT(YEAR FROM "createdAt")::INTEGER
ON CONFLICT ("year") DO UPDATE
SET
  "value" = GREATEST("OrderSequence"."value", EXCLUDED."value"),
  "updatedAt" = CURRENT_TIMESTAMP;
