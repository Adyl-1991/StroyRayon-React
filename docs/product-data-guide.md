# StroyRayon product data guide

Бул документ товар data'ны backend, admin panel, CSV же Google Sheets import'ко даяр кармоо үчүн колдонулат.

## Жаңы товар кошуу

Товар `src/data/products.js` ичинде `product({ ... })` аркылуу кошулат. Негизги талаалар:

- `id`: туруктуу ички идентификатор, өзгөрбөгөнү жакшы
- `titleKg`: кыргызча товар аталышы
- `slug`: URL үчүн туруктуу slug
- `sku`: склад/учет үчүн уникалдуу код
- `catalogPath`: deep catalog node'го чейинки slug массиви
- `brand`: өндүрүүчү же бренд, category эмес
- `price`, `currency`, `unit`
- `stockStatus`: `in_stock`, `low_stock`, `pre_order`, `out_of_stock`
- `specs`: характеристика object
- `faqKg`: `{ question, answer }` object'теринен турган array

## Catalog path

`catalogPath` брендге эмес, товар түрүнө жана колдонуу багытына байланат.

Туура:

```js
catalogPath: ['stroymaterialdar', 'kurgak-aralashmalar', 'shtukaturkalar', 'gipstuu-shtukaturka']
```

Туура эмес:

```js
catalogPath: ['stroymaterialdar', 'brand-name']
```

Бренд дайыма `product.brand` талаасында гана сакталат жана фильтр катары products data'дан чыгат.

## Image naming convention

Product image файлдары кийин төмөнкү структура менен кошулат:

```text
public/images/products/{product-slug}/main.webp
public/images/products/{product-slug}/gallery-1.webp
public/images/products/{product-slug}/gallery-2.webp
```

Category/catalog node image файлдары:

```text
public/images/categories/{catalog-node-slug}.svg
public/images/categories/{catalog-node-slug}.webp
```

Азыр real image жок болсо UI placeholder көрсөтөт. Expected path `product.imageAssets` жана image helper'лер аркылуу даяр турат.

## Image object format

```js
{
  src: '/images/products/ppr-truba-pn20-20mm/main.webp',
  alt: 'ППР труба PN20, 20 мм - StroyRayon',
  width: 900,
  height: 675,
  type: 'product'
}
```

`type` маанилери: `product`, `gallery`, `placeholder`, `external`.

## Validation

Catalog жана product data текшерүү:

```bash
node --input-type=module -e "import { validateCatalogData } from './src/scripts/validateCatalogData.js'; console.log(validateCatalogData())"
```

Sitemap жаңыртуу:

```bash
npm run generate:sitemap
```
