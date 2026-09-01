export const PALLETS = Object.freeze({
  eur: Object.freeze({ id: "eur", name: "Euro pallet", length: 1200, width: 800 }),
  industrial: Object.freeze({ id: "industrial", name: "Industrial pallet", length: 1200, width: 1000 }),
  "north-american": Object.freeze({ id: "north-american", name: "North American pallet", length: 1219, width: 1016 })
});

export const VEHICLES = Object.freeze({
  "20dc": Object.freeze({ id: "20dc", name: "20' Dry", length: 5896, width: 2350, height: 2393, doorWidth: 2340, doorHeight: 2280 }),
  "20rf": Object.freeze({ id: "20rf", name: "20' Reefer", length: 5456, width: 2294, height: 2273, minLength: 5451, minWidth: 2290, minHeight: 2167, doorWidth: 2290, doorHeight: 2264 }),
  "40dc": Object.freeze({ id: "40dc", name: "40' Dry", length: 12032, width: 2350, height: 2393, doorWidth: 2340, doorHeight: 2280 }),
  "40hc": Object.freeze({ id: "40hc", name: "40' High Cube", length: 12032, width: 2350, height: 2697, doorWidth: 2340, doorHeight: 2585 }),
  "40rh": Object.freeze({ id: "40rh", name: "40' HC Reefer", length: 11584, width: 2294, height: 2557, minLength: 11578, minWidth: 2275, minHeight: 2415, doorWidth: 2290, doorHeight: 2569 }),
  "40hwpw": Object.freeze({ id: "40hwpw", name: "40' HC Pallet Wide", length: 12095, width: 2444, height: 2692, doorWidth: 2400, doorHeight: 2584 })
});

export const FLOOR_CAPACITIES = Object.freeze({
  "20dc": Object.freeze({ eur: 11, industrial: 10, "north-american": 10 }),
  "20rf": Object.freeze({ eur: 10, industrial: 9, "north-american": 9 }),
  "40dc": Object.freeze({ eur: 25, industrial: 22, "north-american": 20 }),
  "40hc": Object.freeze({ eur: 25, industrial: 22, "north-american": 20 }),
  "40rh": Object.freeze({ eur: 23, industrial: 20, "north-american": 20 }),
  "40hwpw": Object.freeze({ eur: 30, industrial: 24, "north-american": 22 })
});

export const PUBLIC_EXAMPLES = Object.freeze({
  "20ft-euro": Object.freeze({
    id: "20ft-euro",
    vehicleId: "20dc",
    palletId: "eur",
    quantity: 11,
    loadedHeight: 1500,
    gap: 0,
    rotation: "allowed",
    stacking: false,
    image: "20ft-container-euro-pallet-layout.png",
    imageWidth: 1100,
    imageHeight: 470,
    alt: "LoadComposer floor layout of 11 Euro pallets in the 20 foot Dry container reference",
    caption: "LoadComposer floor-layout result for 11 Euro pallets in the 20' Dry reference; rotation allowed, zero modeled clearance, no stacking."
  }),
  "20ft-reefer-euro": Object.freeze({
    id: "20ft-reefer-euro",
    vehicleId: "20rf",
    palletId: "eur",
    quantity: 10,
    loadedHeight: 1500,
    gap: 0,
    rotation: "allowed",
    stacking: false,
    image: "20ft-reefer-euro-pallet-layout.png",
    imageWidth: 1100,
    imageHeight: 470,
    alt: "LoadComposer floor layout of 10 Euro pallets in the 20 foot Reefer container reference",
    caption: "LoadComposer floor-layout result for 10 Euro pallets in the current 20' Reefer reference; rotation allowed, zero modeled clearance, no stacking."
  }),
  "40ft-euro": Object.freeze({
    id: "40ft-euro",
    vehicleId: "40dc",
    palletId: "eur",
    quantity: 25,
    loadedHeight: 1500,
    gap: 0,
    rotation: "allowed",
    stacking: false,
    image: "40ft-dry-euro-pallet-layout.png",
    imageWidth: 1100,
    imageHeight: 470,
    alt: "LoadComposer floor layout of 25 Euro pallets in the 40 foot Dry container reference",
    caption: "LoadComposer floor-layout result for 25 Euro pallets in the 40' Dry reference; rotation allowed, zero modeled clearance, no stacking."
  }),
  "40ft-hc-euro": Object.freeze({
    id: "40ft-hc-euro",
    vehicleId: "40hc",
    palletId: "eur",
    quantity: 25,
    loadedHeight: 1500,
    gap: 0,
    rotation: "allowed",
    stacking: false,
    image: "40ft-high-cube-euro-pallet-floor-layout.png",
    imageWidth: 1100,
    imageHeight: 470,
    alt: "LoadComposer top-view floor layout of 25 Euro pallets in the 40 foot High Cube reference",
    caption: "Floor-layout example only: this top view shows 25 Euro pallet footprints and does not depict the High Cube's additional vertical clearance."
  }),
  "40ft-reefer-euro": Object.freeze({
    id: "40ft-reefer-euro",
    vehicleId: "40rh",
    palletId: "eur",
    quantity: 23,
    loadedHeight: 1500,
    gap: 0,
    rotation: "allowed",
    stacking: false,
    image: "40ft-hc-reefer-euro-pallet-layout.png",
    imageWidth: 1100,
    imageHeight: 470,
    alt: "LoadComposer floor layout of 23 Euro pallets in the 40 foot High Cube Reefer reference",
    caption: "LoadComposer floor-layout result for 23 Euro pallets in the current 40' HC Reefer reference; rotation allowed, zero modeled clearance, no stacking."
  }),
  "40ft-pallet-wide-euro": Object.freeze({
    id: "40ft-pallet-wide-euro",
    vehicleId: "40hwpw",
    palletId: "eur",
    quantity: 30,
    loadedHeight: 1500,
    gap: 0,
    rotation: "allowed",
    stacking: false,
    image: "40ft-hc-pallet-wide-euro-pallet-layout.png",
    imageWidth: 1100,
    imageHeight: 470,
    alt: "LoadComposer floor layout of 30 Euro pallets in the 40 foot High Cube Pallet Wide container reference",
    caption: "LoadComposer floor-layout result for 30 Euro pallets in the current 40' HC Pallet Wide reference; rotation allowed, zero modeled clearance, no stacking."
  })
});

export const GUIDE_ROUTES = Object.freeze([
  "/guides/",
  "/guides/pallets-in-20ft-container/",
  "/guides/pallets-in-20ft-reefer/",
  "/guides/pallets-in-40ft-container/",
  "/guides/pallets-in-40ft-high-cube/",
  "/guides/pallets-in-40ft-reefer/",
  "/guides/pallets-in-40ft-pallet-wide-container/"
]);
