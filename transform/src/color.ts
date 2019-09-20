import _ from 'lodash';

import { colorSpace as space, DeltaE } from './color-imports';

type ArrayColor = [number, number, number];

function rgb2lab(rgb: ArrayColor): ArrayColor {
  return space.xyz.lab(space.rgb.xyz(rgb));
}

const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
function hex2rgb(origin: string): ArrayColor {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const hex = origin.replace(shorthandRegex, (_m: string, r: string, g: string, b: string) => r + r + g + g + b + b);

  const resultHex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (resultHex) {
    return [
      parseInt(resultHex[1], 16),
      parseInt(resultHex[2], 16),
      parseInt(resultHex[3], 16),
    ];
  }

  const resultRgb = /^rgba?\s*\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\s*\)$/i.exec(hex);
  if (resultRgb) {
    return [
      parseInt(resultRgb[1], 10),
      parseInt(resultRgb[2], 10),
      parseInt(resultRgb[3], 10),
    ];
  }

  console.error('Unparsable color', hex);

  return [0, 0, 0];
}

function labDistance(lab1: ArrayColor, lab2: ArrayColor): number {
  return DeltaE.getDeltaE94(
    { L: lab1[0], A: lab1[1], B: lab1[2] },
    { L: lab2[0], A: lab2[1], B: lab2[2] },
  );
}

const ngaColors = _.mapValues(
  {
    skyblue: '#87ceeb',
    royalblue: '#4169e1',
    blue: '#0000ff',
    darkblue: '#00008b',
    orange: '#ffa500',
    orangered: '#ff4500',
    crimson: '#dc143c',
    red: '#ff0000',
    firebrick: '#b22222',
    darkred: '#8b0000',
    green: '#008000',
    limegreen: '#32cd32',
    seagreen: '#2e8b57',
    teal: '#008080',
    deeppink: '#ff1493',
    tomato: '#ff6347',
    coral: '#ff7f50',
    purple: '#800080',
    indigo: '#4b0082',
    burlywood: '#deb887',
    sandybrown: '#f4a460',
    sienna: '#a0522d',
    chocolate: '#d2691e',
    silver: '#c0c0c0',
  },
  (hex: string) => rgb2lab(hex2rgb(hex)),
);

export function findNearestColor(hex: string) {
  const lab = rgb2lab(hex2rgb(hex));
  const distances = _.map(ngaColors, (ngaLab: ArrayColor, name: string): [number, string] => [
    labDistance(ngaLab, lab),
    name,
  ]);

  return (_.minBy(distances, 0) || _.values(ngaColors)[0])[1];
}
