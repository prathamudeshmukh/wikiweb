// Metro resolves a font file to its asset id (`metro.config.js` adds woff2 to the asset types).
declare module '*.woff2' {
  const asset: number;
  export default asset;
}
