declare module 'pdfjs-dist/build/pdf.min.mjs' {
  const pdfjsLib: any;
  export default pdfjsLib;
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const worker: any;
  export default worker;
}