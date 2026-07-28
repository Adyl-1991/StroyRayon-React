# StroyRayon — аудит индексируемости Google Search Console

Дата аудита: 28 июля 2026

Production: `https://www.stroyrayon.kg`

Канонический домен: `https://www.stroyrayon.kg`

Коммит реализации: `267d9f6` (`Fix storefront indexability and SEO URL issues`)

Подробный машиночитаемый результат по каждому URL находится в
`reports/google-search-console-indexability-audit-2026-07-28.json`.

## 1. Ограничение исходных данных Google Search Console

Экспорт Coverage от 24 июля 2026 содержит только агрегаты:

- проиндексировано: 60;
- не проиндексировано: 5;
- Page with redirect: 2;
- Not found (404): 1;
- Crawled — currently not indexed: 2;
- Validation: Not started.

В экспорте нет пяти точных URL. Поэтому этот аудит не утверждает, что именно
эти пять URL исправлены. Ни один найденный ниже адрес нельзя достоверно
сопоставить со строкой GSC без раздела Examples из Search Console.

## 2. Итог production-аудита

Полный повторный аудит выполнен 28 июля 2026 в 13:05 по времени Бишкека после
развёртывания коммита `267d9f6`.

| Проверка | До исправлений | После исправлений |
|---|---:|---:|
| URL в sitemap | 413 | 413 |
| Sitemap URL с редиректом | 0 | 0 |
| Sitemap URL с 404 | 0 | 0 |
| Sitemap URL с 5xx | 0 | 0 |
| Sitemap URL с noindex | 0 | 0 |
| Отсутствующий canonical | 0 | 0 |
| Несовпадающий canonical | 0 | 0 |
| Отсутствующий title / description / H1 | 0 / 0 / 0 | 0 / 0 / 0 |
| Группы одинаковых title | 1 | 0 |
| Группы одинаковых description | 1 | 0 |
| Группы одинаковых H1 | 1 | 0 |
| Сломанные внутренние ссылки | 0 | 0 |
| Внутренние ссылки с редиректом | 0 | 0 |
| URL-сироты в sitemap | 9 | 0 |
| Неизвестный маршрут возвращает soft 404 | да, HTTP 200 | нет, HTTP 404 |
| Приватные маршруты без noindex | 0 | 0 |
| Критические ошибки итогового QA | — | 0 |

Все 413 URL из production sitemap возвращают прямой `200 OK`. В sitemap нет
редиректов, 404, 5xx, noindex, legacy slug, параметризованных URL и canonical
на другой адрес. Для каждого URL собраны status, final URL, redirect count,
canonical, robots, title, description, H1, тип страницы и найденные проблемы.

## 3. Причины, найденные до исправлений

### 3.1. Soft 404 для любого неизвестного пути

Catch-all rewrite `/(.*) -> /index.html` заставлял Vercel возвращать главную
страницу с HTTP 200 для несуществующих URL. Контрольный адрес:

`https://www.stroyrayon.kg/__seo_indexability_missing_probe__`

До исправления он возвращал HTTP 200 и canonical главной страницы. После
исправления возвращает HTTP 404, canonical `/404` и
`robots=noindex, nofollow, noarchive`.

Это подтверждённая техническая причина soft 404, но без Examples из GSC нельзя
утверждать, что именно она соответствует единственному URL в группе GSC
Not found (404).

### 3.2. Дубли метаданных

Две разные категории назывались одинаково «Грунтовка» и имели одинаковые
title, description и H1:

- `https://www.stroyrayon.kg/catalog/stroymaterial/kurgak-aralashmalar/gruntovkalar`
- `https://www.stroyrayon.kg/catalog/boiok-tush-kagaz/gruntovka`

Названия разделены на «Строительные грунтовки» и «Грунтовка под краску» с
отдельными кыргызскими вариантами. После развёртывания групп дублей нет.

### 3.3. Страницы-сироты в статическом HTML

До исправления девять sitemap URL не имели входящих ссылок в
пререндеренном HTML:

- `https://www.stroyrayon.kg/contacts`
- `https://www.stroyrayon.kg/delivery`
- `https://www.stroyrayon.kg/payment`
- `https://www.stroyrayon.kg/return`
- `https://www.stroyrayon.kg/about`
- `https://www.stroyrayon.kg/privacy`
- `https://www.stroyrayon.kg/blog`
- `https://www.stroyrayon.kg/product/montazhdyk-aralashma-25kg`
- `https://www.stroyrayon.kg/product/remonttuk-aralashma-25kg`

Причинами были неполная статическая навигация и ограничение списка
пререндеренных товарных ссылок. После исправления orphan URL: 0.

### 3.4. Старые URL категорий

В старых QA-сценариях сохранились три legacy slug:

- `https://www.stroyrayon.kg/catalog/kurulush` → `/catalog/stroymaterial`
- `https://www.stroyrayon.kg/catalog/shaimandar` → `/catalog/instrument`
- `https://www.stroyrayon.kg/catalog/bekitkich` → `/catalog/krepezh`

В production до исправления catch-all отдавал по ним нерелевантную страницу с
HTTP 200. Теперь внутренние проверки используют финальные URL, legacy URL
отсутствуют в sitemap и получают постоянный Vercel redirect.

Vercel преобразует `permanent: true` в HTTP 308, а не 301. Это постоянный
редирект без цепочки, но кодовая платформа не выполняет буквальное требование
«301 only». Ни один внутренний или sitemap URL на эти редиректы не ссылается.

### 3.5. Товары без цены и отсутствующие фотографии

У 19 активных товаров нет положительной цены. Карточка раньше позволяла
добавить такой товар в корзину с нулевой ценой. Теперь количество и кнопка
корзины скрыты, а покупателю показывается запрос цены через WhatsApp.

Каталог также сначала запрашивал запланированный, но отсутствующий WebP и
только после ошибки показывал локальную заглушку. Теперь позиции без
подтверждённого изображения сразу используют тематическую заглушку, без
лишнего запроса и мигания.

## 4. Рендеринг SPA и метаданные

Сайт остаётся React/Vite SPA, но production build статически пререндерит
значимый HTML для всех 413 индексируемых маршрутов. Прямое открытие товара или
категории отдаёт в исходном HTML уникальные title, description, canonical,
robots, H1, контент, ссылки и JSON-LD. Поисковому роботу не требуется ждать
клиентскую смену метаданных.

Транзакционные и приватные SPA-маршруты `/admin`, `/admin/*`, `/search`,
`/cart`, `/checkout` сохраняют rewrite на `index.html` и получают
`X-Robots-Tag: noindex, nofollow`.

Языковой переключатель не создаёт отдельные URL: кыргызский и русский интерфейс
используют один pathname и сохраняют locale в браузере. Серверный
пререндеренный индексируемый вариант — кыргызский (`lang=ky`). Переключатель
проверен в обоих языках, но русский контент сейчас не является отдельной
индексируемой страницей и не имеет `/ru/` URL или hreflang. Создание отдельной
русской URL-структуры — самостоятельная миграция маршрутов и canonical, она не
выполнялась без доказанной необходимости.

## 5. Контентные риски

Следующие списки — консервативные эвристики локального контент-аудита, а не
подтверждённые причины двух URL GSC Crawled — currently not indexed. Эти
страницы не удалены из sitemap: у них есть уникальные метаданные, H1,
canonical, спецификации, хлебные крошки, внутренние ссылки и JSON-LD.
Выдуманный контент не добавлялся.

### 5.1. Короткое основное описание: 47 товаров

Порог аудита: менее 180 символов. Все позиции относятся к EVER PLAST:

```text
ever-plast-ppr-pipe-pn20
ever-plast-ppr-elbow-90
ever-plast-ppr-elbow-45
ever-plast-ppr-clip
ever-plast-ppr-tee
ever-plast-ppr-plug
ever-plast-ppr-cross
ever-plast-ppr-coupling
ever-plast-ppr-bypass
ever-plast-ppr-reducer
ever-plast-ppr-reducing-tee
ever-plast-ppr-combined-tee-vr
ever-plast-ppr-combined-tee-nr
ever-plast-ppr-combined-elbow-vr
ever-plast-ppr-combined-elbow-nr
ever-plast-ppr-double-wall-elbow-vr
ever-plast-ppr-double-wall-elbow-nr
ever-plast-ppr-wall-elbow-vr
ever-plast-ppr-wall-elbow-nr
ever-plast-ppr-combined-coupling-vr
ever-plast-ppr-combined-coupling-nr
ever-plast-ppr-union-vr
ever-plast-ppr-union-nr
ever-plast-ppr-filter
ever-plast-ppr-valve
ever-plast-sewer-coupling
ever-plast-sewer-elbow-45
ever-plast-sewer-elbow-90
ever-plast-sewer-special-elbow
ever-plast-sewer-plug
ever-plast-sewer-revision
ever-plast-sewer-reducer
ever-plast-sewer-tee-90
ever-plast-sewer-tee-45
ever-plast-sewer-cross
ever-plast-sewer-spigot
ever-plast-sewer-external-elbow-45
ever-plast-sewer-external-elbow-90
ever-plast-sewer-external-revision
ever-plast-sewer-external-tee-45
ever-plast-sewer-external-tee-90
ever-plast-sewer-clip
ever-plast-sewer-metal-clamp
ever-plast-sewer-pipe-50-internal
ever-plast-sewer-pipe-110-internal
ever-plast-sewer-pipe-110-external
ever-plast-sewer-pipe-160-external
```

### 5.2. Менее двух FAQ: 34 товара

```text
alinex-gidroizoliacionnaia-smes-alinex-aquaflex
alinex-gidroizoliacionnaia-smes-alinex-aquaproof
alinex-gidroizoliacionnaia-stukaturka-alinex-aquaplaster
alinex-dobavka-dlya-gidroizolyacii
alinex-gruntovka-dlia-pola-alinex-primer-2
alinex-gruntovka-alinex-primer
alinex-zatirka-dlia-svov-alinex-fixline
alinex-zatirka-dlia-svov-gipsokartonnyx-listov-gkl-alinex-joint
alinex-klei-stukaturka-dlia-sistemy-skreplennoi-teploizoliacii-alinex-set-307
alinex-nalivnoi-pol-alinex-level2
alinex-nalivnoi-pol-alinex-unilevel
alinex-promyslennyi-rovnitel-dlia-pola-alinex-level-3
alinex-rovnitel-dlia-pola-alinex-level-1
alinex-plitocnyi-klei-alinex-set-300
alinex-plitocnyi-klei-alinex-set-302
alinex-plitocnyi-klei-alinex-set-305
alinex-plitocnyi-klei-alinex-set-308
alinex-plitocnyi-klei-alinex-set-set-301
alinex-klei-dlia-gkl-alinex-unifix
alinex-cementnaia-spatlevka-alinex-finish-wp
alinex-spatlevka-alinex-glatt
alinex-spatlevka-polimernaia-alinex-finish-premium
alinex-spatlevka-polimernaia-alinex-finish
alinex-gipsovaia-stukaturnaia-smes-alinex-grender
alinex-dekorativnaia-relefnaia-stukaturka-alinex-fortress
alinex-zarostoikaiaia-stukaturka-alinex-termoplaster
alinex-saniruiushhaia-stukaturka-alinex-sanirplast
alinex-cementnaia-stukaturnaia-smes-alinex-forman
alinex-cementnaia-stukaturnaia-smes-alinex-uniplaster-m-50
alinex-stukaturka-gipsovaia-usilennaia-alinex-grender-wp
alinex-stukaturka-dlia-dekorativnoi-otdelki
alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-20
alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-25
alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-35
```

### 5.3. Цена уточняется: 19 товаров

```text
alinex-gidroizoliacionnaia-smes-alinex-aquaproof
alinex-dobavka-dlya-gidroizolyacii
alinex-gruntovka-dlia-pola-alinex-primer-2
alinex-klei-stukaturka-dlia-sistemy-skreplennoi-teploizoliacii-alinex-set-307
alinex-nalivnoi-pol-alinex-level2
alinex-promyslennyi-rovnitel-dlia-pola-alinex-level-3
alinex-rovnitel-dlia-pola-alinex-level-1
alinex-cementnaia-spatlevka-alinex-finish-wp
alinex-spatlevka-polimernaia-alinex-finish-premium
alinex-dekorativnaia-relefnaia-stukaturka-alinex-fortress
alinex-zarostoikaiaia-stukaturka-alinex-termoplaster
alinex-saniruiushhaia-stukaturka-alinex-sanirplast
alinex-cementnaia-stukaturnaia-smes-alinex-forman
alinex-cementnaia-stukaturnaia-smes-alinex-uniplaster-m-50
alinex-stukaturka-gipsovaia-usilennaia-alinex-grender-wp
alinex-stukaturka-dlia-dekorativnoi-otdelki
alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-20
alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-25
alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-35
```

У всех 247 активных товаров не менее трёх спецификаций. У 145 товаров
показывается локальная тематическая заглушка или запланированная иллюстрация
вместо подтверждённой фотографии. Это остаётся контентным риском; добавлять
неподтверждённые фотографии автоматически нельзя. Приоритет — реальные фото
для двух URL, которые владелец получит из GSC Examples, затем для карточек с
наибольшим поисковым спросом.

## 6. Изменения в коде

- добавлен `npm run qa:seo:indexability` с настраиваемыми
  `SEO_BASE_URL`, `SEO_CANONICAL_ORIGIN`, concurrency, timeout и JSON-отчётом;
- удалён глобальный Vercel catch-all rewrite для публичных страниц;
- сохранены точечные SPA rewrites только для admin/search/cart/checkout;
- добавлены реальный 404 response, статический `404.html`, noindex и полезный
  React Not Found UI;
- добавлены постоянные legacy redirects и заменены старые URL в QA;
- устранены дубли категорий «Грунтовка»;
- добавлены статические ссылки на информационные страницы и все товары,
  устранены девять orphan URL;
- расширены SEO regression-тесты: динамическое число sitemap URL, уникальность
  метаданных, отсутствие сирот, отсутствие catch-all и корректность legacy;
- исправлены карточки товаров без цены: WhatsApp inquiry вместо нулевой
  корзины;
- отсутствующие запланированные фото сразу используют локальную заглушку;
- обновлён storefront QA под действующие подписи, ленивую главную и
  асинхронный поиск.

## 7. Выполненные проверки

| Команда | Результат |
|---|---|
| `npm run build` | PASS; 247 активных товаров, 413 sitemap URL, 413 пререндеренных маршрутов |
| `npm run test:seo` | PASS; 11/11 |
| `npm run validate:catalog` | PASS; 0 предупреждений |
| `npm run test:checkout` | PASS; 4/4 |
| `npm run test:localization` | PASS; 5/5 |
| `npm run test:carkit` | PASS; 3/3 |
| `npm run test:content` | PASS; 2/2 |
| `npm run test:pwa` | PASS; 4/4 |
| `npm run lint` | PASS |
| `npm run qa:bundle` | PASS |
| `npm run qa:customer` | PASS; 1934/1934, viewport 360/390/768/1024/1366, kg/ru, 0 console errors, 0 failed assets |
| `npm test` в `api` | PASS; 68/68 |
| `npm run build` в `api` | PASS |
| `npm run qa:seo:indexability` на production | PASS; 413/413, 0 critical issues |
| `npm run production:smoke` | PASS; API health/database/catalog/product/image/auth checks |

Дополнительный `qa:customer:live` на production был запущен дважды с одним
viewport. Оба запуска завершились до assertions таймаутом ответа CDP
`Page.navigate` (30 и 90 секунд) на текущем медленном соединении. Это не
зафиксированный дефект страницы, но и не пройденный live-браузерный тест.
Production напрямую подтверждён полным HTTP/HTML SEO-аудитом и API smoke;
полный браузерный customer QA пройден на точной production-сборке локально.

## 8. Оставшиеся инфраструктурные и контентные риски

1. `http://stroyrayon.kg/` делает два постоянных перехода:
   `http apex` → `https apex` → `https www`. Остальные варианты домена делают
   не более одного перехода. Для буквального выполнения требования одного
   hop владелец домена должен настроить прямой redirect
   `http://stroyrayon.kg/*` → `https://www.stroyrayon.kg/*` в DNS/CDN/Vercel.
   В кодовой базе это безопасно не устраняется; внешняя настройка не заявляется
   выполненной.
2. Vercel permanent redirects имеют статус 308, не 301.
3. Точные пять URL GSC неизвестны.
4. Google должен повторно обойти исправленные страницы; результат Coverage не
   меняется мгновенно после deploy.
5. Русская версия работает как клиентский locale на том же URL и отдельно не
   индексируется.
6. 47 описаний короткие, 34 карточки имеют менее двух FAQ, 19 цен требуют
   уточнения, 145 карточек не имеют подтверждённой фотографии.
7. Дополнительный production live-CDP customer QA не завершён из-за сетевого
   таймаута; его следует повторить при стабильном соединении.

## 9. Действия владельца в Google Search Console

Эти действия нельзя выполнить из кодовой базы, и они не заявляются
выполненными:

1. Открыть каждый из трёх типов проблем в Google Search Console.
2. Открыть раздел Examples.
3. Скопировать точные пять затронутых URL.
4. Сравнить их с URL и результатами этого аудита.
5. Для каждого исправленного URL запустить URL Inspection.
6. Нажать Request indexing там, где URL должен индексироваться.
7. Повторно отправить `https://www.stroyrayon.kg/sitemap.xml`.
8. Нажать Validate fix для соответствующих групп.
9. Через 7–14 дней снова экспортировать Coverage и сравнить показатели.

Если GSC Examples содержат URL, отсутствующий в подробном JSON-аудите и
legacy-списках выше, его нужно проверить отдельно до заявления о полном
исправлении исходных пяти URL.

## Confirmed Merchant Listing Issue — Missing Product Image

### Исходная проблема

- раздел Google Search Console: Merchant listings / «Данные о товарах продавца»;
- ошибка: Missing field `image` / «Отсутствует поле `image`»;
- обнаружено: 28 июля 2026;
- последний обход Google: 28 июля 2026;
- затронутый URL: `https://www.stroyrayon.kg/product/start-shpaklevka-20kg`;
- название в GSC: «Жука тегиздөөчү аралашма старт 20 кг».

В исходном HTML находился один валидный объект Product JSON-LD, но без свойства
`image`. В production API у товара была только общая SVG-заглушка
`/images/placeholders/product-building-placeholder.svg` с
`storageDriver=legacy`; реального основного изображения и объекта R2 не было.
Локальный файл `public/images/products/start-shpaklevka-20kg/main.webp` изображал
другой товар Dalmia DSP и ранее уже был отклонён фотоаудитом. Использовать его
как изображение товара было бы недостоверно.

Упрощённый вид прежних структурированных данных:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Жука тегиздөөчү аралашма старт 20 кг",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "KGS"
  }
}
```

### Принятое владельцем решение

Владелец магазина решил не публиковать вымышленное или чужое изображение, а
полностью снять товар с продажи. Дополнительно снята карточка:

`https://www.stroyrayon.kg/product/alinex-stukaturka-gipsovaia-usilennaia-alinex-grender-wp`

Оба slug внесены в единый список снятых товаров. Они исключаются из публичного
каталога, поиска, sitemap, SEO-пререндера, связанных товаров и заказного
каталога. Для `start-shpaklevka-20kg`, существующего в PostgreSQL, добавлена
Prisma-миграция мягкой деактивации (`isActive=false`), сохраняющая целостность
старых заказов. Устаревший ответ API также фильтруется фронтендом до применения
миграции.

После снятия товара корректным результатом является отсутствие Product JSON-LD
и ответ HTTP 404, а не Product с выдуманным `image`. Финальный публичный URL
изображения и content type неприменимы: товар удалён, фотография намеренно не
создавалась.

### Общая реализация Product image

Помимо удаления карточек исправлен общий механизм для оставшихся товаров:

- JSON-LD использует массив абсолютных публичных HTTPS-изображений;
- исключаются пустые значения, SVG-заглушки, брендовые картинки, localhost,
  приватные R2/S3 endpoint и дубликаты;
- основное фото согласуется с `og:image`, `twitter:image` и изображением в
  пререндеренном HTML;
- production build получает публичные R2-изображения через открытый API без
  приватных ключей;
- при SPA-переходах старый Product JSON-LD удаляется и не накапливается;
- отсутствующий или снятый товар получает noindex-интерфейс без устаревшей
  Product-разметки.

До исправления production-аудит обнаружил ещё семь индексируемых карточек,
которые имели публичные R2-фото в API, но не передавали их в исходный HTML:

```text
kabel-kanal-25x16-2
izolenta-kara
gofra-tutuk-16mm
gofra-tutuk-20mm
internet-kabel-cat5e
perforaciyalangan-montazh-lenta
ppr-tutuk-keskich
```

Общий build-time механизм устраняет эти расхождения без slug-специфичных
исключений.

### Результат локального аудита перед публикацией

- индексируемых товарных страниц: 245;
- отдельно проверенных снятых URL: 2;
- всего проверок URL: 247;
- прошли: 247;
- критических ошибок: 0;
- Product JSON-LD: 245 из 245;
- страниц без подтверждённого реального изображения: 137 предупреждений;
- битых изображений: 0;
- изображений с редиректом: 0;
- дублирующихся Product schema: 0;
- несогласованных Product/OG/Twitter/видимых изображений: 0;
- sitemap: 411 URL, из них 245 товаров;
- заказной каталог: 227 товаров / 480 записей.

Полный список 137 товаров без подтверждённого изображения и результаты по
каждому URL сохранены в
`reports/google-merchant-structured-data-audit-2026-07-28.json`.

### Изменённые компоненты

- общий валидатор и нормализатор Product image;
- генератор Product JSON-LD;
- React SEO-компонент и очистка JSON-LD при навигации;
- загрузка товара и фильтрация снятых slug;
- production SEO-пререндер и синхронизация публичных R2-фото;
- sitemap и серверный заказной каталог;
- Prisma-миграция деактивации;
- `qa:structured-data` и 14 регрессионных сценариев;
- тест ожидаемого количества активных товаров;
- этот отчёт и подробный JSON-аудит.

### Выполненные проверки перед deploy

| Команда | Результат |
|---|---|
| `SEO_SYNC_PUBLIC_IMAGES=1 npm run build` | PASS; 245 товаров, 411 маршрутов |
| `npm run test:structured-data` | PASS; 14/14 |
| `npm run test:seo` | PASS; 11/11 |
| `npm run test:checkout` | PASS; 4/4 |
| `npm run test:alinex` | PASS; 3/3 |
| `npm run test:ever-plast` | PASS; 6/6 |
| `npm run test:carkit` | PASS; 3/3 |
| `npm run test:images` | PASS; 8/8 |
| `npm run test:localization` | PASS; 5/5 |
| `npm run test:content` | PASS; 2/2 |
| `npm run test:pwa` | PASS; 4/4 |
| `npm run validate:catalog` / `npm run sync:catalog` | PASS; 0 предупреждений |
| `npm run lint` | PASS |
| `npm run qa:bundle` | PASS |
| `npm run qa:customer` | PASS; 1934/1934 |
| `npm run qa:structured-data` на production preview | PASS; 247/247 |
| `npm run prisma:validate` в `api` | PASS |
| `npm test` в `api` | PASS; 68/68 |
| `npm run build` и `npm run lint` в `api` | PASS |

### Production и ручное действие

На момент подготовки этого раздела production deployment ещё не выполнен.
Поэтому HTTP 404 для двух снятых URL, применение миграции и итоговая разметка
оставшихся карточек пока не заявляются как проверенные на рабочем домене.

После успешной production-проверки владельцу нужно открыть Merchant listings →
Missing field `image` и нажать Validate fix. Удалённый URL не нужно отправлять
через Request indexing: Google должен повторно обойти его и удалить товарный
результат. Успех проверки GSC нельзя считать подтверждённым до ответа Google.
