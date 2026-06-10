import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const rootDir = process.cwd()
const imageRoot = path.join(rootDir, 'public', 'images', 'products')
const sourceDocPath = path.join(rootDir, 'docs', 'product-image-sources.md')

const commonSupplierNote = 'Public supplier/manufacturer catalog image; reuse permission not independently verified.'
const commonOpenNote = 'Open-license Wikimedia Commons image; attribution/license retained in this source log.'

const entries = [
  {
    slug: 'ppr-truba-pn20',
    imageUrl: 'https://cdn.globalso.com/bestopvalveindustry/PPR-Pipe-1.jpg',
    sourcePage: 'https://www.bestopvalveindustry.com/ppr-pipes-product/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product marking only',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-truba-pn20-25mm',
    imageUrl: 'https://cdn.globalso.com/bestopvalveindustry/PPR-Pipe-1.jpg',
    sourcePage: 'https://www.bestopvalveindustry.com/ppr-pipes-product/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product marking only',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'armirlengen-ppr-truba-32mm',
    imageUrl: 'https://cdn.globalso.com/bestopvalveindustry/PPR-Pipe-1.jpg',
    sourcePage: 'https://www.bestopvalveindustry.com/ppr-pipes-product/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product marking only',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-mufta-20mm',
    imageUrl: 'https://www.megaaz.com/web/image/product.template/17983/image_1024',
    sourcePage: 'https://www.megaaz.com/shop/ppr-coupling-20mm-white-17983',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-ugolok-90',
    imageUrl: 'https://www.megaaz.com/web/image/product.template/17949/image_1024',
    sourcePage: 'https://www.megaaz.com/shop/ppr-elbow-90deg-20mm-white-17949',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-troynik-25mm',
    imageUrl: 'https://www.pprpipefittings.com/wp-content/uploads/PPR-Pipe-Fittings-Tee.png',
    sourcePage: 'https://www.pprpipefittings.com/ppr-pipe-fittings/ppr-pipe-fittings-tee.html',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-sharovyi-kran-25mm',
    imageUrl: 'https://ik.imagekit.io/fepy/cdn/catalog/product/p/p/ppr_ball_valve_25mm_1__1.png',
    sourcePage: 'https://www.fepy.com/ppr-ball-valve-25-mm',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-perehodnik-25-20',
    imageUrl: 'https://luckypvc.com/wp-content/uploads/2025/04/PPR-MALE-ADAPTER-3.png',
    sourcePage: 'https://luckypvc.com/product/pp-r-fittings-tee-reducer/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ppr-kombinirovannaya-mufta-20-12',
    imageUrl: 'https://www.pprpipefittings.com/wp-content/uploads/ppr-fittings-ppr-pipe-fittings-ppr-socket-adaptor-1.jpg',
    sourcePage: 'https://www.pprpipefittings.com/ppr-pipe-fittings/ppr-pipe-fittings-tee.html',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'kanalizatsiya-ugolok-50mm-45',
    imageUrl: 'https://elbow45.com/cdn/shop/products/new_0174_1200x1200.jpg?v=1594447378',
    sourcePage: 'https://elbow45.com/products/aplaco-elbow-45-sch40',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; embossed product brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'kanalizatsiya-troynik-110-50mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/96/T%C3%A9s_de_plomberie.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:T%C3%A9s_de_plomberie.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC0 via Wikimedia Commons.',
  },
  {
    slug: 'pnd-truba-25mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Hdpe_pipe_installation.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Hdpe_pipe_installation.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'rasshiritelnyi-bak-24l',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Expansion_tank.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Expansion_tank.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'Public domain via Wikimedia Commons.',
  },
  {
    slug: 'schetchik-vody-15',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/WMBUS_Water_Meter_for_submetering.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:WMBUS_Water_Meter_for_submetering.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC0 via Wikimedia Commons.',
  },
  {
    slug: 'reduktor-davleniya-12',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Pressure-regulator_hg.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Pressure-regulator_hg.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 4.0 via Wikimedia Commons.',
  },
  {
    slug: 'manometr-6bar',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/MAXIMATOR-High-Pressure-Manometer-02.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:MAXIMATOR-High-Pressure-Manometer-02.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; manufacturer label visible',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'gips-shtukaturkasy-30kg',
    imageUrl: 'https://market.yapisaninsaat.com/images/products/Product131_1539829ac4f128.jpg',
    sourcePage: 'https://market.yapisaninsaat.com/knauf-alci-62-131.html',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'cementtuu-shtukaturka-25kg',
    imageUrl: 'https://market.yapisaninsaat.com/images/products/Product131_1539829ac4f128.jpg',
    sourcePage: 'https://market.yapisaninsaat.com/knauf-alci-62-131.html',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'plitka-kleyi-standard-25kg',
    imageUrl: 'https://www.qwikmix.com/images/bags/Tile%20Adhesive%20Floor.jpg',
    sourcePage: 'https://www.qwikmix.com/tile_adhesive.html',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'start-shpaklevka-20kg',
    imageUrl: 'https://knackpackaging.com/img/products/bbb/1.png',
    sourcePage: 'https://knackpackaging.com/bbb.php',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'finish-shpaklevka-25kg',
    imageUrl: 'https://knackpackaging.com/img/products/bbb/1.png',
    sourcePage: 'https://knackpackaging.com/bbb.php',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'gruntovka-tereng-singuu-10l',
    imageUrl: 'https://img.rockwool.com/https%3A%2F%2Fbrandcommunity.rockwool.com%2Fasset%2FaapZB4kelTdZwoQb-EBYYg%2Fasset.png?auto=format,compress&fit=max&q=75&w=975&s=1e1d3feacea31455066cfe5bee61b9eb',
    sourcePage: 'https://www.rockwool.com/de/produkte/rockwool-universal-grundierung/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'ozu-tegizdeluuchu-pol-25kg',
    imageUrl: 'https://siegeladhesives.com/volumes/images/Product-Thumbnails-2026/Bag/_1000x1000_crop_center-center_60_none/33946/SuperLevel-PRO.webp',
    sourcePage: 'https://siegeladhesives.com/superelevel',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'gidroizolyaciya-smes-20kg',
    imageUrl: 'https://media.remmers.com/celum/export/gebindeabbildungen/1200w/180480.png',
    sourcePage: 'https://www.remmers.com/de/bauten-bodenschutz/sanierung/kellersanierung/multifunktionale-bauwerksabdichtung-1k/mb-1k-rapid/p/000000000000085105',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'zatirka-dlya-plitki-2kg',
    imageUrl: 'https://gemix-ws-media.s3.amazonaws.com/media/uploads/images/Tile_Grout.jpg',
    sourcePage: 'https://www.gemix.com/products/tilegrout',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'portlandcement-m500-50kg',
    imageUrl: 'https://www.tucompa.com.mx/cdn/shop/products/descarga_1_-01.webp?v=1672941314&width=1100',
    sourcePage: 'https://tucompa.com/products/cemento-blanco-50-kgs',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; product packaging brand visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'kadimki-gipsokarton-125mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Drywall.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Drywall.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'Public domain via Wikimedia Commons.',
  },
  {
    slug: 'kabel-vvgng-3x2-5',
    imageUrl: 'https://rahmat.uz/photos/products_xl/fjfrwGPUc2JX.jpeg',
    sourcePage: 'https://rahmat.uz/narxi/kabel-vvgng-3x2-5-oj-0-66-1',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'pvs-provod-3x1-5',
    imageUrl: 'https://rahmat.uz/photos/products_xl/fjfrwGPUc2JX.jpeg',
    sourcePage: 'https://rahmat.uz/narxi/kabel-vvgng-3x2-5-oj-0-66-1',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'avtomat-16a-1p',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Circuit_Breaker_2.png',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Circuit_Breaker_2.png',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC0 via Wikimedia Commons.',
  },
  {
    slug: 'uzo-2p-40a',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Circuit_breaker_2_pole_on_DIN_rail.JPG',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Circuit_breaker_2_pole_on_DIN_rail.JPG',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; product markings visible',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'difavtomat-16a',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Circuit_breaker_2_pole_on_DIN_rail.JPG',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Circuit_breaker_2_pole_on_DIN_rail.JPG',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; product markings visible',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'rozetka-ichki-montazh-ak',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Inverted_is_power_socket_variant.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Inverted_is_power_socket_variant.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 4.0 via Wikimedia Commons.',
  },
  {
    slug: 'led-svetilnik-18w',
    imageUrl: 'https://carbonestore.com/cdn/shop/files/26_DI-12-18WWH-CCT-Z.jpg?v=1731626499',
    sourcePage: 'https://carbonestore.com/products/lampara-de-techo-led-plafon-18w-cct-2',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'kabel-kanal-16x16',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Angular_trunking_accessories.JPG',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Angular_trunking_accessories.JPG',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'Public domain via Wikimedia Commons.',
  },
  {
    slug: 'gofra-tutuk-16mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Wellschlauch.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Wellschlauch.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'raspredkorobka-80',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Electrical_Junction_Box_-_geograph.org.uk_-_6570804.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Electrical_Junction_Box_-_geograph.org.uk_-_6570804.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 2.0 via Wikimedia Commons.',
  },
  {
    slug: 'ashkana-smesiteli-basic',
    imageUrl: 'https://watermarkdesigns.imgix.net/products/images/CRT502-C.png?crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=630&q=80&w=1200',
    sourcePage: 'https://watermark-designs.com/product/crt502-evright',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'vanna-smesiteli-dush-komplekti',
    imageUrl: 'https://watermarkdesigns.imgix.net/products/images/31-6.1HS-BK.png?crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=630&q=80&w=1200',
    sourcePage: 'https://watermark-designs.com/product/31-6-1hs-bk',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'rakovina-smesitel-basic',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Faucet_in_a_bathroom_sink.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Faucet_in_a_bathroom_sink.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC0 via Wikimedia Commons.',
  },
  {
    slug: 'dush-sistemasy-basic',
    imageUrl: 'https://watermarkdesigns.imgix.net/products/images/31-6.1HS-BK.png?crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=630&q=80&w=1200',
    sourcePage: 'https://watermark-designs.com/product/31-6-1hs-bk',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'sifon-botolko-40mm',
    imageUrl: 'https://queramic.com/10150-large_default/sifon-botella-pvc-blanco-optima.jpg',
    sourcePage: 'https://queramic.com/accesorios-de-bano-y-ducha/sifon-botella-pvc-blanco-optima.html',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'trap-dushevoi-10x10',
    status: 'skipped',
    sourcePage: 'No clean direct shower-drain packshot found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped after candidate direct image returned 404.',
  },
  {
    slug: 'vodonagrevatel-50l',
    imageUrl: 'https://whitepointelabd.com/wp-content/uploads/2024/04/WPEWH50-2.png',
    sourcePage: 'https://whitepointelabd.com/product/white-point-electric-water-heater-50-liters-in-white-color-wpewh50/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/contact; product brand mark visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'perforator-800w',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Drill_inside.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Drill_inside.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'drel-650w-udarnyi',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Drill_inside.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Drill_inside.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'bolgarka-125mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/db/AngleGrinder.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:AngleGrinder.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; product brand label visible',
    licenseNote: 'CC BY-SA 2.0 via Wikimedia Commons.',
  },
  {
    slug: 'akkumulyatorduk-shurupovert-12v',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Cordless_Screwdriver_-_unbranded.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Cordless_Screwdriver_-_unbranded.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'Public domain via Wikimedia Commons.',
  },
  {
    slug: 'ruletka-5m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Measuring-tape.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Measuring-tape.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'Public domain via Wikimedia Commons.',
  },
  {
    slug: 'uroven-60sm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Level_%28AM_70130%29.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Level_(AM_70130).jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; museum label visible in source crop',
    licenseNote: 'CC BY 4.0 via Wikimedia Commons.',
  },
  {
    slug: 'kurulush-bychagy',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Lenox_utility_knife.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Lenox_utility_knife.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; product brand label visible',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'shpatel-100mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Plamuurmes.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Plamuurmes.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'ventilyaciya-reshetkasy-150x150mm',
    imageUrl: 'https://ventilation-system.com/download/rg-image-5565.png',
    sourcePage: 'https://ventilation-system.com/product/rg-150x150/',
    sourceType: 'manufacturer catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'pvc-ventilyaciya-kanaly-55x110',
    imageUrl: 'https://hr.elmarkstore.eu/data/uploads/moxesImages/oi53kn2zzp5qs718sjul_np8lufhiw7l52eqxok.png',
    sourcePage: 'https://hr.elmarkstore.eu/5010-flat-pvc-cijev-za-zrak-55x110x1000-k1--product22709',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'vytyazhnoi-ventilyator-100mm',
    imageUrl: 'https://ik.imagekit.io/o4cnyksipjh/live/images/d7b0b587-cd8b-4291-9889-3e13495c1d16.png',
    sourcePage: 'https://zim-zone.co.uk/luft-wall-mount-100mm-bathroom-extractor-fan-with-backdraft-damper',
    sourceType: 'supplier catalog',
    watermarks: 'No watermark/contact; small product brand mark visible',
    licenseNote: commonSupplierNote,
  },
  {
    slug: 'vodoemulsiyalyk-boyok-10l',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Tjallem_Plastic_enamel_pic4.JPG',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Tjallem_Plastic_enamel_pic4.JPG',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; product label visible',
    licenseNote: 'CC0 via Wikimedia Commons.',
  },
  {
    slug: 'emal-pf115-kara',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Testor%27s_Black_Enamel_%281%29.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Testor%27s_Black_Enamel_(1).jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/contact; product label visible',
    licenseNote: 'CC0 via Wikimedia Commons.',
  },
  {
    slug: 'valik-boyok-uchun-250mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Farbroller.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Farbroller.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 2.0 via Wikimedia Commons.',
  },
  {
    slug: 'kist-50mm',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Paint_brushes_%2830800%29.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Paint_brushes_(30800).jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 4.0 via Wikimedia Commons.',
  },
  {
    slug: 'sugat-shlangy-34-25m',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Garden_hose.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Garden_hose.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 3.0 via Wikimedia Commons.',
  },
  {
    slug: 'mat-teplyi-pol-2m2',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Electric_underfloor_heating_mats.jpg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Electric_underfloor_heating_mats.jpg',
    sourceType: 'open-license image',
    watermarks: 'No watermark/logo/contact seen',
    licenseNote: 'CC BY-SA 4.0 via Wikimedia Commons.',
  },
  {
    slug: 'mehanikalyk-termoregulyator',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'ppr-klipsa-20',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'kanalizatsiya-truba-50mm',
    status: 'skipped',
    sourcePage: 'No high-quality direct pipe packshot found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid low-resolution/pixelated source.',
  },
  {
    slug: 'kanalizatsiya-truba-110mm',
    status: 'skipped',
    sourcePage: 'No high-quality direct pipe packshot found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid low-resolution/pixelated source.',
  },
  {
    slug: 'pnd-fiting-mufta-25',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'filtr-gruboi-ochistki-12',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'filtr-korpus-10',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'kartridzh-polipropilen-10',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'ud-profil-27x28',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'cd-profil-60x27',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'tuz-podves',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'perforaciyalangan-burchtuk',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: '1-klavishaluu-ochurguch',
    status: 'skipped',
    sourcePage: 'No clean direct switch packshot found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'podrozetnik-plastik',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
  {
    slug: 'gigienicheskii-dush-komplekt',
    status: 'skipped',
    sourcePage: 'No clean direct product image found in Stage A search.',
    sourceType: 'placeholder fallback',
    watermarks: 'N/A',
    licenseNote: 'Skipped to avoid unclear source/permission.',
  },
]

const tableHeader = [
  '| Product slug | Local path | Source URL | Source type | Watermark/logo/contact | License/permission note | Status |',
  '| --- | --- | --- | --- | --- | --- | --- |',
]

const rateLimitedSkips = new Set([
  'manometr-6bar',
  'difavtomat-16a',
  'rozetka-ichki-montazh-ak',
  'kabel-kanal-16x16',
  'gofra-tutuk-16mm',
  'raspredkorobka-80',
  'rakovina-smesitel-basic',
  'bolgarka-125mm',
  'akkumulyatorduk-shurupovert-12v',
  'ruletka-5m',
  'uroven-60sm',
  'kurulush-bychagy',
  'shpatel-100mm',
  'vodoemulsiyalyk-boyok-10l',
  'emal-pf115-kara',
  'valik-boyok-uchun-250mm',
  'kist-50mm',
  'sugat-shlangy-34-25m',
  'mat-teplyi-pol-2m2',
])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function escapeTableValue(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function isWikimediaUploadUrl(url) {
  return String(url).startsWith('https://upload.wikimedia.org/wikipedia/commons/')
}

function toWikimediaThumbnailUrl(url) {
  const value = String(url)
  if (!isWikimediaUploadUrl(value) || value.includes('/thumb/')) return value

  const parsed = new URL(value)
  const parts = parsed.pathname.split('/')
  const fileName = parts.at(-1)
  if (!fileName) return value

  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${fileName}?width=800`
}

async function fetchImage(entry) {
  const url = toWikimediaThumbnailUrl(entry.imageUrl)

  if (isWikimediaUploadUrl(url)) {
    await sleep(1200)
  }

  let response = await fetch(url, {
    headers: {
      'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 StroyRayon product image importer',
    },
  })

  if (response.status === 429 && isWikimediaUploadUrl(url)) {
    await sleep(5000)
    response = await fetch(url, {
      headers: {
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 StroyRayon product image importer',
      },
    })
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function writeImage(entry) {
  const productDir = path.join(imageRoot, entry.slug)
  const outPath = path.join(productDir, 'main.webp')
  await fs.mkdir(productDir, { recursive: true })

  try {
    const existing = await fs.stat(outPath)
    return {
      localPath: `/images/products/${entry.slug}/main.webp`,
      size: existing.size,
    }
  } catch {
    // Missing file is expected for new imports.
  }

  const input = await fetchImage(entry)

  await sharp(input, { animated: false })
    .rotate()
    .resize({
      width: 900,
      height: 675,
      fit: 'contain',
      withoutEnlargement: true,
      background: '#ffffff',
    })
    .webp({ quality: 82, effort: 4 })
    .toFile(outPath)

  const stat = await fs.stat(outPath)
  return {
    localPath: `/images/products/${entry.slug}/main.webp`,
    size: stat.size,
  }
}

function buildDoc(results) {
  const added = results.filter((item) => item.status === 'added')
  const skipped = results.filter((item) => item.status === 'skipped')
  const failed = results.filter((item) => item.status === 'failed')
  const totalSize = added.reduce((sum, item) => sum + item.size, 0)
  const avgSize = added.length ? Math.round(totalSize / added.length) : 0
  const largest = [...added].sort((a, b) => b.size - a.size).slice(0, 10)

  const rows = results.map((item) => {
    const sourceUrl = item.imageUrl ? `${item.sourcePage} | image: ${item.imageUrl}` : item.sourcePage
    const status = item.status === 'added' ? `added (${Math.round(item.size / 1024)} KB)` : item.status
    return `| ${escapeTableValue(item.slug)} | ${escapeTableValue(item.localPath)} | ${escapeTableValue(sourceUrl)} | ${escapeTableValue(item.sourceType)} | ${escapeTableValue(item.watermarks)} | ${escapeTableValue(item.licenseNote)} | ${escapeTableValue(status)} |`
  })

  const largestRows = largest.map((item) => `- ${item.slug}: ${Math.round(item.size / 1024)} KB`)

  return [
    '# Product Image Sources',
    '',
    'Stage A product photos v1. Images are converted to WebP at 900x675 with `object-fit: contain` friendly white padding. Rows marked `skipped` intentionally keep the existing branded placeholder/fallback until a clean source is confirmed.',
    '',
    `- Added WebP images: ${added.length}`,
    `- Skipped candidates: ${skipped.length}`,
    `- Failed downloads/conversions: ${failed.length}`,
    `- Average added image size: ${Math.round(avgSize / 1024)} KB`,
    '',
    'Largest generated files:',
    ...largestRows,
    '',
    ...tableHeader,
    ...rows,
    '',
  ].join('\n')
}

const results = []

for (const entry of entries) {
  if (entry.status === 'skipped' || rateLimitedSkips.has(entry.slug)) {
    results.push({
      ...entry,
      localPath: `/images/products/${entry.slug}/main.webp`,
      status: 'skipped',
      size: 0,
      licenseNote: rateLimitedSkips.has(entry.slug)
        ? `${entry.licenseNote} Candidate kept in the log; skipped in v1 after source rate-limit/robot-policy response.`
        : entry.licenseNote,
    })
    continue
  }

  try {
    const written = await writeImage(entry)
    results.push({ ...entry, ...written, status: 'added' })
    console.log(`added ${entry.slug} ${Math.round(written.size / 1024)}KB`)
  } catch (error) {
    results.push({
      ...entry,
      localPath: `/images/products/${entry.slug}/main.webp`,
      status: 'failed',
      size: 0,
      licenseNote: `${entry.licenseNote} Import failed: ${error.message}`,
    })
    console.error(`failed ${entry.slug}: ${error.message}`)
  }
}

await fs.mkdir(path.dirname(sourceDocPath), { recursive: true })
await fs.writeFile(sourceDocPath, buildDoc(results), 'utf8')

const addedCount = results.filter((item) => item.status === 'added').length
const skippedCount = results.filter((item) => item.status === 'skipped').length
const failedCount = results.filter((item) => item.status === 'failed').length
console.log(`done: ${addedCount} added, ${skippedCount} skipped, ${failedCount} failed`)

if (failedCount > 0) {
  process.exitCode = 1
}
