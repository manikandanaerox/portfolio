/*
  Photo fly-through (components/Gallery). Web copies in public/gallery, made from
  the originals (now in ../portfolio-originals): EXIF-rotated, 1100px long edge, WebP.
  Captions say only what the photo shows.
*/
export type Photo = { src: string; w: number; h: number; tag: string; caption: string };

const p = (n: number, w: number, h: number, tag: string, caption: string): Photo => ({
  src: `/gallery/photo-${String(n).padStart(2, "0")}.webp`,
  w,
  h,
  tag,
  caption,
});

export const photos: Photo[] = [
  p(1, 1100, 825, "Flying", "At the airfield"),
  p(2, 825, 1100, "Flying", "In the cockpit"),
  p(3, 1100, 825, "Flying", "Airborne"),
  p(4, 825, 1100, "Flying", "Headset on"),
  p(5, 1100, 825, "Flying", "Before take-off"),
  p(6, 1100, 825, "Flying", "Cockpit selfie"),
  p(7, 1100, 825, "Flying", "On the runway"),
  p(8, 1100, 734, "Building", "With the team"),
  p(9, 1100, 734, "Testing", "Flight test"),
  p(10, 825, 1100, "Building", "Building the airframe"),
  p(11, 825, 1100, "Building", "Assembly"),
  p(12, 1100, 825, "Building", "Integration"),
  p(13, 1100, 825, "Testing", "Field test"),
  p(14, 1100, 825, "Testing", "Field day with the team"),
  p(15, 901, 1100, "Testing", "FPV"),
  p(16, 1100, 825, "Testing", "Pre-flight checks"),
  p(17, 825, 1100, "Off duty", "At the air museum"),
  p(18, 825, 1100, "Off duty", "Paris"),
  p(19, 825, 1100, "Off duty", "Paris"),
  p(20, 825, 1100, "Off duty", "Paris"),
  p(21, 866, 1100, "Off duty", "Downtime"),
];
